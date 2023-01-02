//moulberry.codes/lowestbin.json.gz
const axios = require("axios");
const fs = require("fs");
const http = require("https"); // or 'https' for https:// URLs
const zlib = require("zlib");

async function getBZ() {
  axios
    .get("https://api.hypixel.net/skyblock/bazaar", { headers: { "API-Key": "a29d3e80-9cfc-4e9f-9d31-0dbeb560ca8a" } })
    .then((response) => {
      fs.writeFile("./files/bzar.json", JSON.stringify(response.data.products), "utf8", () => {
        console.log("BZ Download Completed");
      });
    })
    .catch((error) => {
      console.log(error);
    });
}

async function getAH() {
  const file = fs.createWriteStream("./files/ah.json.gz");
  const request = http.get("https://moulberry.codes/auction_averages/3day.json.gz", function (response) {
    response.pipe(file);
    file.on("finish", () => {
      file.close();
      console.log("AH Download Completed");
      const fileContents = fs.createReadStream(`./files/ah.json.gz`);
      const writeStream = fs.createWriteStream(`./files/ah.json`);
      const unzip = zlib.createGunzip();
      fileContents.pipe(unzip).pipe(writeStream, () => {
        fs.unlinkSync("./files/ah.json.gz");
      });
    });
  });
}

function updateCycle() {
  console.log("Updating prices");
  getBZ();
  getAH();
}

setInterval(() => {
  updateCycle();
}, 259200000);

updateCycle()