const express = require("express");
const bodyParser = require("body-parser");
const url = require("url");
const querystring = require("querystring");
const axios = require("axios");

let app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const items = {};
var last_updated_items = 0;
var updating = false;

function updateData() {
  updating = true;
  axios
    .get("https://api.slothpixel.me/api/skyblock/items")
    .then((response) => {
      for (const [id, item] of Object.entries(response.data)) {
        items[item.name.toLowerCase()] = item;
        items[item.name.toLowerCase()].id = id;
        items[item.item_id.toString()] = item;
        items[item.item_id.toString()].id = id;
      }
      last_updated_items = new Date();
      updating = false;
      console.log(Object.keys(items).length);
    })
    .catch((error) => {
      console.log(error);
      updating = false;
    });
}

// Function to handle the root path
app.get("/api/prices", async function (req, res) {
  // Access the provided 'page' and 'limt' query parameters
  // Access the provided 'page' and 'limt' query parameters
  let query = req.query.q;
  if (!query) {
    res.send("Missing query field");
    return;
  }
  let item = query.split(" ").join("_").toUpperCase()
  if (!item) {
    res.send("L'object n'existe pas");
    return;
  }
  console.log(item);

  axios
    .get("https://api.slothpixel.me/api/skyblock/bazaar/" + item)
    .then((response) => {
      if (response.data.error) {
        if (response.data.error == "Invalid itemId") {
          res.send("L'object n'est pas vendu au bazar");
          return;
        } else {
          res.send("Une erreur est survenue");
          return;
        }
      } else {
        let sum = response.data.quick_status;
        if (!sum) {
          res.send(`Impossible d'obtenir les prix pour cet objet`);
          return;
        }
        res.send(`[${query}] Achat: ${sum.buyPrice.toString().split(".")[0]}, Vente: ${sum.sellPrice.toString().split(".")[0]}`);
        return;
      }
    })
    .catch((error) => {
        axios
        .get("https://api.slothpixel.me/api/skyblock/auctions?sortBy=starting_bid&id=" + item)
        .then((response) => {
            axios
            .get("https://api.slothpixel.me/api/skyblock/auctions?sortBy=highest_bid_amount&id=" + item)
            .then((response) => {
            res.send(`[${query}] En vente: ${response.data.matching_query}, Prix de départ le plus bas: ${response.data.auctions[response.data.auctions.length -1].starting_bid}, Enchère la plus basse: ${response.data.auctions[response.data.auctions.length -1].highest_bid_amount}`);
            return;
            })
        })
        .catch((error) => {
            res.send(`Impossible d'obtenir les prix pour cet objet`);
            return;
        });
    });
});


let server = app.listen(8000, function () {
  console.log("Server is listening on port 8000");
});
