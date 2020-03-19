import puppeteer from "puppeteer";
import { getOptions } from "../util/options";
import { NowResponse, NowRequest } from "@now/node";

const URL = `https://public.tableau.com/views/DashboardCovid-19Jakarta_15837354399300/Dashboard22?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true`;
const isDev = process.env.NOW_REGION === "dev1";

function parseTableauString(tableauString: string) {
  return tableauString
    .split(/\d+;{/g)
    .filter(d => d !== "")
    .map(d => JSON.parse(`{${d}`));
}

function coronaJakartaTableauParser(jsons, raw, verbose) {
  const [
    integer,
    real,
    label
  ] = jsons[1].secondaryInfo.presModelMap.dataDictionary.presModelHolder.genDataDictionaryPresModel.dataSegments[
    "0"
  ].dataColumns.map(a => a.dataValues);
  const data = {
    odp: {
      total: integer[28],
      proses: integer[0],
      selesai: integer[1]
    },
    pdp: {
      total: integer[29],
      dirawat: integer[2],
      pulang: integer[29] - integer[2]
    },
    totalByRegion: {
      jakartaPusat: integer[3],
      jakartaUtara: integer[4],
      jakartaTimur: integer[5],
      jakartaSelatan: integer[6],
      jakartaBarat: integer[7],
      unknown: integer[8],
      outsideJakarta:
        integer[28] +
        integer[29] -
        (integer[3] +
          integer[4] +
          integer[5] +
          integer[6] +
          integer[7] +
          integer[8])
    },
    nasional: {
      positif: integer[32],
      dirawat: integer[34],
      sembuh: integer[18],
      meninggal: integer[33],
      ratio: {
        male: real[26],
        female: real[27]
      },
      details: {
        male: {
          unknown: integer[9],
          lt5: integer[10],
          "6_19": integer[11],
          "20_29": integer[12],
          "30_39": integer[13],
          "40_49": integer[14],
          "50_59": integer[15],
          "60_69": integer[16],
          "70_79": integer[17],
          gt80: integer[18]
        },
        female: {
          unknown: integer[19],
          lt5: integer[20],
          "6_19": integer[21],
          "20_29": integer[22],
          "30_39": integer[23],
          "40_49": integer[24],
          "50_59": integer[25],
          "60_69": integer[26],
          "70_79": integer[27],
          gt80: integer[28]
        }
      }
    },
    raw: raw
      ? {
          integer,
          real,
          label
        }
      : undefined,
    json1: verbose ? jsons[0] : undefined,
    json2: verbose ? jsons[1] : undefined
  };

  return data;
}

async function getScrapedData(resolver, raw, verbose) {
  const data = [];
  const browser = await puppeteer.launch(await getOptions(isDev));
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  let shouldAbort = false;
  let responseCounter = 0;

  page.on("request", interceptedRequest => {
    if (
      shouldAbort ||
      interceptedRequest.resourceType() === "stylesheet" ||
      interceptedRequest.resourceType() === "image"
    ) {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
      if (interceptedRequest.resourceType() === "xhr") {
        shouldAbort = true;
      }
    }
  });

  page.on("response", interceptedResponse => {
    const request = interceptedResponse.request();
    // console.log(++responseCounter, request.url(), request.resourceType());
    if (request.resourceType() === `xhr`) {
      //   console.log(interceptedResponse);
      interceptedResponse
        .text()
        .then((txt: string) => {
          resolver(
            coronaJakartaTableauParser(parseTableauString(txt), raw, verbose)
          );
        })
        .catch(err => {
          console.log(err);
          resolver({ error: err.message });
        });
    }
  });

  await page.goto(URL);
  await browser.close();
  return data;
}

export default async (request: NowRequest, response: NowResponse) => {
  const resolver = (data: any) => {
    response.json({ data });
  };
  try {
    await getScrapedData(
      resolver,
      (request.query.raw as string) === "true",
      (request.query.verbose as string) === "true"
    );
  } catch (error) {
    response.status(500);
  }
};
