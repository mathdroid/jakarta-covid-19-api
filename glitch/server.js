const express = require("express"),
  app = express();

const getScrapedData = require("./scrape");

function coronaJakartaTableauParser(json) {
  const array =
    json.secondaryInfo.presModelMap.dataDictionary.presModelHolder
      .genDataDictionaryPresModel.dataSegments["0"].dataColumns[0].dataValues;
  const data = {
    odp: {
      total: array[28],
      proses: array[0],
      selesai: array[1]
    },
    pdp: {
      total: array[29],
      dirawat: array[2],
      pulang: array[3]
    },
    nasional: {
      positif: array[32],
      dirawat: array[34],
      sembuh: array[18],
      meninggal: array[33]
    },
    raw: json,
    array
  };

  return data;
}

app.all(`/`, async function(req, res) {
  try {
    const data = await getScrapedData();
    console.log(data);
    res.json(coronaJakartaTableauParser(data));
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

var listener = app.listen(process.env.PORT, function() {
  console.log("Your bot is running on port " + listener.address().port);
});
