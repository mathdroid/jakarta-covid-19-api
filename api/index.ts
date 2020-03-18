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

function coronaJakartaTableauParser(json, raw) {
  const [
    integer,
    real,
    label
  ] = json.secondaryInfo.presModelMap.dataDictionary.presModelHolder.genDataDictionaryPresModel.dataSegments[
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
      pulang: integer[3]
    },
    nasional: {
      positif: integer[32],
      dirawat: integer[34],
      sembuh: integer[18],
      meninggal: integer[33],
      ratio: {
        male: real[26],
        female: real[27]
      }
    },
    raw: raw
      ? {
          integer,
          real,
          label
        }
      : undefined
    // array
  };

  return data;
}

async function getScrapedData(resolver, raw) {
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
          resolver(coronaJakartaTableauParser(parseTableauString(txt)[1], raw));
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
    await getScrapedData(resolver, (request.query.raw as string) === "true");
  } catch (error) {
    response.status(500);
  }
};
