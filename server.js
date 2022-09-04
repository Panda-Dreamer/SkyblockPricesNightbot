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
  let query = req.query.q;
  if (!query) {
    res.send("Missing query field");
    return;
  }
  let item = items[query.toLowerCase()];
  if (!item) {
    res.send("L'object n'existe pas");
    return;
  }
  console.log(item);

  axios
    .get("https://api.slothpixel.me/api/skyblock/bazaar/" + item.id)
    .then((response) => {
      if (response.error) {
        if (response.error == "Invalid itemId") {
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
        res.send(`[${item.name}] Achat: ${sum.buyPrice.split(".")[0]}, Vente: ${sum.sellPrice.split(".")[0]}`);
        return;
      }
    })
    .catch((error) => {
      console.log(error);
      res.send("Une erreur est survenue");
      return;
    });
});

let server = app.listen(8080, function () {
  console.log("Server is listening on port 8080");
});

updateData();
