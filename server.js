const express = require("express");
const bodyParser = require("body-parser");
const url = require("url");
const querystring = require("querystring");
const axios = require("axios");
const { arch } = require("os");
const fs = require('fs');
let app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var items = {};
var bzitems = {};
var last_updated_items = 0;
var updating = false;

function RequestPage(number) {
  return new Promise((resolve, reject) => {
    axios
      .get("https://api.hypixel.net/skyblock/auctions?page=" + number, { headers: { "API-Key": "a29d3e80-9cfc-4e9f-9d31-0dbeb560ca8a" } })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        resolve(false);
      });
  });
}

function updateData() {
  axios
    .get("https://api.hypixel.net/skyblock/bazaar", { headers: { "API-Key": "a29d3e80-9cfc-4e9f-9d31-0dbeb560ca8a" } })
    .then((response) => {
      for (const [product_id, product] of Object.entries(response.data.products)) {
        bzitems[product.product_id.replaceAll("_", " ").toLocaleLowerCase().split(":")[0]] = product;
      }
      
      fs.writeFile('bzar.json', JSON.stringify(bzitems), 'utf8',(()=>{console.log("BZ saved")}));
    })
    .catch((error) => {
      console.log(error);
    });
  updating = true;
  new_items = {};
  axios
    .get("https://api.hypixel.net/skyblock/auctions?page=0", { headers: { "API-Key": "a29d3e80-9cfc-4e9f-9d31-0dbeb560ca8a" } })
    .then(async (response) => {
      let page_count = response.data.totalPages;
      //console.log("Page count:", page_count);
      for (var i = 1; i < page_count; i++) {
        data = await RequestPage(i);
        //process.stdout.write(`Processing page n°${i}, Number of auctions: ${data.auctions.length}; Items processed: ${Object.entries(new_items).length}, Total auctions:${response.data.totalAuctions}                  \re`);
        if (data != false && data.success == true) {
          for (var ai = 0; ai < data.auctions.length; ai++) {
            let auction = data.auctions[ai];
            auction.item_name = auction.item_name
              .replaceAll("✪", "")
              .replaceAll("✦", "")
              .replaceAll("➍", "")
              .replaceAll("⚚", "")
              .replaceAll("➎", "")
              .replaceAll("✿", "")
              .replaceAll("➌", "")
              .replaceAll("➊", "")
              .replaceAll("➋", "")
              .replaceAll("➍", "")
              .replaceAll("➏", "")
              .replaceAll("➐", "")
              .replaceAll("➑", "")
              .replaceAll("➒", "")
              .replaceAll("➓", "")
              .replaceAll("◆", "")
              .split(" - ")[0]
              .replace(/\[.*\]/, "")
              .replace(/\(.*\)/, "");
            while (auction.item_name.charAt(0) === " ") {
              auction.item_name = auction.item_name.substring(1);
            }
            auction.item_name = auction.item_name.trimEnd()
            let key = auction.item_name.toLowerCase()
            let prefixes = ["Gentle","Odd","Fast","Fair","Epic","Sharp","Heroic","Spicy","Legendary","Dirty","Fabled","Suspicious","Gilded","Warped","Withered","Bulky","Salty","Treacherous","Stiff","Lucky","Wise","Refined","Perfect","Superior","Itchy","Unpleasant","Spiked","Fabled","Renowned","Cubic","Silky","Reinforced","Magnetic","Fruitful","Necrotic","Undead","Bloody","Precise","Ridiculous","Loving","Spiritual","Shaded","Ancient","Moil","Toil","Blessed","Fleet","Mithraic","Auspicious","Stellar","Headstrong","Stiff","Bountiful","Jaded","Double-Bit","Lumberjack's","Great","Rugged","Lush","Zooming","Unyielding","Sturdy","Hyper","Mythic","Fierce","shiny","Clean","Pure","light","raggedy","honed","grand","rapid","awkward","unreal","thick","heavy","strengthened","deadly","titanic","smart","fine","vanquished","glistening","coldfused","excellent","thicc","candied","waxed","empowered","heated","Heroic"]
            prefixes = [... prefixes, ...prefixes]
            for (var pi = 0; pi < prefixes.length; pi++) { 
              key = key.toLowerCase().replace(`${prefixes[pi].toLowerCase()} `,"")
            }
            item = new_items[key];
            process.stdout.write(`Items processed: ${Object.entries(new_items).length}/${response.data.totalAuctions}, Page:${i}/${page_count}                    \r`);

            if (!item) {
              //console.log(`Adding item:${auction.item_name}`)
              new_items[key] = {
                name: auction.item_name,
                lowest_starting_bid: auction.starting_bid,
                lowest_highest_bid: auction.highest_bid_amount || "99999999999999999999999999999999999999999",
                amount: 1,
                highest_starting_bid: auction.starting_bid,
                highest_highest_bid: auction.highest_bid_amount || "0",

                moy_sb: {
                  data: [],
                },
                moy_hb: {
                  data: [],
                },
              };

              if (auction.lowest_starting_bid) {
                new_items[key].moy_sb.data.push(auction.lowest_starting_bid);
              }

              if (auction.highest_bid_amount && auction.highest_bid_amount != 0) {
                new_items[key].moy_hb.data.push(auction.highest_bid_amount);
              }
            } else {
              let current_item = new_items[key];
              new_items[key].amount = current_item.amount + 1;

              if (current_item.lowest_starting_bid > auction.starting_bid) {
                new_items[key].lowest_starting_bid = auction.starting_bid;
              }

              if (current_item.lowest_highest_bid > auction.highest_bid_amount) {
                new_items[key].lowest_highest_bid = auction.highest_bid_amount;
              }

              if (current_item.highest_starting_bid < auction.starting_bid) {
                new_items[key].highest_starting_bid = auction.starting_bid;
              }

              if (current_item.highest_starting_bid < auction.highest_bid_amount) {
                new_items[key].highest_starting_bid = auction.highest_bid_amount;
              }

              if (auction.starting_bid) {
                new_items[key].moy_sb.data.push(auction.starting_bid);
              }

              if (auction.bin == false) {
                if (auction.highest_bid_amount && auction.highest_bid_amount != 0) {
                  new_items[key].moy_hb.data.push(auction.highest_bid_amount);
                }
              }else{
                if (auction.starting_bid && auction.starting_bid != 0) {
                  new_items[key].moy_hb.data.push(auction.starting_bid);
                }
              }
            }
          }
        }
      }
      for (const [itemName, item] of Object.entries(items)) {
        if (!new_items[itemName]) {
          new_items[itemName] = item;
        }
      }
      for (const [itemName, item] of Object.entries(new_items)) {
        let sum = item.moy_hb.data.reduce((a, b) => a + b, 0);
        new_items[itemName].moy_hb.result = sum / item.moy_hb.data.length;

        sum = item.moy_sb.data.reduce((a, b) => a + b, 0);
        new_items[itemName].moy_sb.result = sum / item.moy_sb.data.length;
      }
      items = new_items;
      console.log("Items processed: ", Object.entries(items).length);
      fs.writeFile('ah.json', JSON.stringify(items), 'utf8',(()=>{console.log("AH saved")}));
      updating = false;
    })
    .catch((error) => {
      console.log(error);
      updating = false;
    });
}

function nFormatter(num, digits) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}

// Function to handle the root path
app.get("/api/prices", async function (req, res) {
  let query = req.query.q;

  if (!query) {
    res.send("Utilisation: ![cmd] <nom de l'objet>");
    return;
  }
  if(!query.toLocaleLowerCase() =="jimmyboyyy"){
    res.send(`[JimmyBoyyy] (DA) - Acheter: 1.1T, Vendre: 200G (PS: le commerce d'humain c'est bizarre quand même)`)
  }

  let item = items[query.toLocaleLowerCase()];
  let bzitem = bzitems[query.toLocaleLowerCase()];

  //console.log(query.toLocaleLowerCase(), item);
  //console.log(query.toLocaleLowerCase(), bzitem);

  if (!item && !bzitem) {
    res.send("Pas d'item trouvé avec ce nom");
    return;
  }

  let bzstring = ``;
  let ahstring = ``;
  let queryString = `[${query}]`;
  let separator = "";

  if (bzitem) {
    bzstring = ` (BZ) - Acheter: ${nFormatter(bzitem.quick_status.buyPrice, 1)},  Vendre: ${nFormatter(bzitem.quick_status.sellPrice, 1)}`;
  }

  if (item) {
    let lowprice = `Prix moyen: ${nFormatter(item.moy_hb.result, 1)}`;
    let highprice = item.highest_starting_bid > item.highest_highest_bid ? "Enchère la plus haute: " + nFormatter(item.highest_starting_bid) + ";" : "Enchère la plus haute: " + nFormatter(item.highest_highest_bid) + ";";
    ahstring = ` (AH) -  ${lowprice} ${highprice}`;
  }

  if (ahstring != "" && bzstring != "") {
    separator = "||";
  }

  finalString = queryString + bzstring + separator + ahstring;
  res.send(finalString);
});


app.get("/api/dump", async function (req, res) {
  res.send(JSON.stringify(items))
})
let server = app.listen(8000, function () {
  items = JSON.parse(fs.readFileSync("ah.json","utf-8"))
  console.log(`Loaded ${Object.entries(items).length} items from ah.json`)
  console.log("Server is listening on port 8000");
  updateData();
  setInterval(updateData, 600000);
});
