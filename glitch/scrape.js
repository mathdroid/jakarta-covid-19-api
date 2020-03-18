const fs = require("fs");
const puppeteer = require("puppeteer");

const URL = `https://public.tableau.com/views/DashboardCovid-19Jakarta_15837354399300/Dashboard22?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true`;

// EXAMPLE RESPONSE

// 273827;{"asdf":30}74783;{"confirmed":200}

function tableauParser(jumbledString) {
  fs.writeFileSync("./response.txt", jumbledString.split(";").join("\n"));
  const jsonString = jumbledString.split(";{").map(str => `{${str}`)[1];
  return jsonString;
}

async function getScrapedData(url = URL) {
  let jsonData = "";
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on("request", interceptedRequest => {
    interceptedRequest.continue();
  });

  page.on("response", response => {
    const request = response.request();
    if (request.resourceType() === `xhr`) {
      response.text().then(txt => {
        jsonData = jsonData === "" ? `{${txt.split(";{")[2]}` : jsonData;
      });
    }
  });

  await page.goto(url);
  await browser.close();
  return JSON.parse(jsonData);
}

async function screenshotAyat(page, type) {
  const ayat = await page.$("#bismillah + div");
  return ayat.screenshot({ type });
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

module.exports = getScrapedData;
