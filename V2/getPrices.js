//moulberry.codes/lowestbin.json.gz
const axios = require("axios");
const fs = require("fs");
const http = require("https"); // or 'https' for https:// URLs
const zlib = require("zlib");
const nbt = require("prismarine-nbt");
var bz;
var neu;
async function getBZ() {
  axios
    .get("https://api.hypixel.net/skyblock/bazaar", { headers: { "API-Key": "a29d3e80-9cfc-4e9f-9d31-0dbeb560ca8a" } })
    .then((response) => {
      fs.writeFile("./files/bzar.json", JSON.stringify(response.data.products), "utf8", () => {
        console.log("BZ download Completed");
      });
    })
    .catch((error) => {
      console.log(error);
    });
}

async function getNEU() {
  const file = fs.createWriteStream("./files/neu.json.gz");
  const request = http.get("https://moulberry.codes/auction_averages/3day.json.gz", function (response) {
    response.pipe(file);
    file.on("finish", () => {
      file.close();
      console.log("AH download Completed");
      const fileContents = fs.createReadStream(`./files/neu.json.gz`);
      const writeStream = fs.createWriteStream(`./files/neu.json`);
      const unzip = zlib.createGunzip();
      fileContents.pipe(unzip).pipe(writeStream, () => {
        fs.unlinkSync("./files/neu.json.gz");
      });
    });
  });
}

function RequestPage(number) {
  return new Promise((resolve, reject) => {
    console.log("Downloading page ", number);
    axios
      .get("https://api.hypixel.net/skyblock/auctions?page=" + number, { headers: { "API-Key": "a29d3e80-9cfc-4e9f-9d31-0dbeb560ca8a" } })
      .then((response) => {
        //console.log(`Page ${number} success`);
        resolve(response.data);
      })
      .catch((error) => {
        console.log(`Page ${number} error`);
        resolve(false);
      });
  });
}

async function getAH() {
  return new Promise((resolve, reject) => {
    CompiledData = {};
    axios.get("https://api.hypixel.net/skyblock/auctions?page=0", { headers: { "API-Key": "a29d3e80-9cfc-4e9f-9d31-0dbeb560ca8a" } }).then(async (response) => {
      let page_count = response.data.totalPages;
      for (var page = 1; page <= page_count; page++) {
        // changed page_count to 1 for testing
        data = await RequestPage(page);
        if (data != false && data.success == true) {
          count = data.auctions.length;
          for (var ai = 0; ai < count; ai++) {
            let auction = data.auctions[ai];
            if (auction.bin == true) {
              itemData = await evaluateValue(auction);
              auctionPrice = auction.starting_bid / itemData.count;
              if (CompiledData[itemData.internalKey] == undefined) {
                CompiledData[itemData.internalKey] = {
                  count: 1,
                  avgRawPrice: {
                    list: [itemData.rawPrice],
                    value: itemData.rawPrice,
                  },
                  avgPrice: {
                    list: [auctionPrice],
                    value: auctionPrice,
                  },
                  avgDelta: {
                    list: [auctionPrice - itemData.rawPrice],
                    value: auctionPrice - itemData.rawPrice,
                  },
                  salesPerDay: neu[itemData.internalKey.split(":")[0]] != undefined ? Math.round(neu[itemData.internalKey.split(":")[0]].sales / 3) : 0,

                  lowestBin: auctionPrice,
                  lowestRawPrice: itemData.rawPrice,
                };
              } else {
                collectedData = CompiledData[itemData.internalKey];
                collectedData.count += 1;

                collectedData.avgRawPrice.list.push(itemData.rawPrice);
                collectedData.avgPrice.list.push(auctionPrice);
                collectedData.avgDelta.list.push(auctionPrice - itemData.rawPrice);

                if (collectedData.lowestBin > auctionPrice && auctionPrice > 0) {
                  collectedData.lowestBin = auctionPrice;
                }

                if (collectedData.lowestRawPrice > itemData.rawPrice && itemData.rawPrice > 0) {
                  collectedData.lowestRawPrice = itemData.rawPrice;
                }
              }
            }
          }
        }
      }
      keys = Object.keys(CompiledData);
      for (var ii = 0; ii < keys.length; ii++) {
        key = keys[ii];
        item = CompiledData[key];
        CompiledData[key].avgRawPrice.value = await calcAvg(item.avgRawPrice.list);
        CompiledData[key].avgPrice.value = await calcAvg(item.avgPrice.list);
        CompiledData[key].avgDelta.value = await calcAvg(item.avgDelta.list);
      }
      fs.writeFile("./files/ah.json", JSON.stringify(CompiledData), "utf8", () => {
        console.log("Compiled download and processing Completed");
        resolve()
      });
    });
  });
}

async function calcAvg(array) {
  var total = 0;
  for (var i = 0; i < array.length; i++) {
    total += array[i];
  }
  return total / array.length;
}

async function readData(auction) {
  let buff = Buffer.from(auction.item_bytes, "base64");
  data2 = (await nbt.parse(buff)).parsed.value.i.value.value[0];
  const regex = /\u00A7[0-9A-FK-OR]/gi;

  stars = {
    "": 0,
    "➊": 1,
    "➋": 2,
    "➌": 3,
    "➍": 4,
    "➎": 5,
  };

  formattedData = {
    id: data2.id.value,
    count: data2.Count.value,
    damage: data2.Damage.value,
    description: "",
    name: auction.item_name,
    //key: await getKey(data2.tag.value.ExtraAttributes.value.id.value),
    key: data2.tag.value.ExtraAttributes.value.id.value,
    valueInformation: {
      isFiveStars: auction.item_name.replace(/[^✪]/g, "").length == 5,
      masterStar: stars[(auction.item_name.replace(/[^➊➋➌➍➎]/g), "")],
    },
    raw: data2,
  };

  text = "";
  for (var line = 0; line < data2.tag.value.display.value.Lore.value.value.length; line++) {
    text += data2.tag.value.display.value.Lore.value.value[line].replace(regex, "") + " ";
  }
  formattedData.description = text;
  formattedData.valueInformation.enchants = await getEnchants(formattedData.description);
  if (data2.tag) {
    if (data2.tag.value.ExtraAttributes.value) {
      if (data2.tag.value.ExtraAttributes.value.modifier) {
        formattedData.modifier = data2.tag.value.ExtraAttributes.value.modifier.value;
      }
    }
  }
  rarityObj = await checkItemType(auction.item_lore.replace(/\u00A7[0-9A-FK-OR]/gi, ""));
  formattedData.internalKey = await getKey(formattedData, rarityObj);
  return formattedData;
}

function getBzValue(key) {
  if (bz[key] == undefined) {
    //console.warn(`${key} is not in bazaar !`)
    return 0;
  }
  return Math.round(bz[key].quick_status.buyPrice) - Math.round(bz[key].quick_status.buyPrice) * 0.3;
}

async function checkItemType(lore) {
  rarityObj = {
    rarity: "UNKNOWN",
    Itemtype: "UNKNOWN",
    dungeon: false,
  };
  typeMatches = ["SWORD", "FISHING ROD", "PICKAXE", "AXE", "SHOVEL", "PET ITEM", "TRAVEL SCROLL", "REFORGE STONE", "BOW", "BELT", "LEGGINGS", "CHESTPLATE", "HELMET", "BOOTS", "ITEM", "ACCESSORY", "GLOVES", "PET ITEM", "HOE", "WAND", "COSMETIC"];
  rarityArr = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "SPECIAL", "VERY SPECIAL", "SUPREME"];
  split = lore.split("\n");
  for (var li = split.length - 1; li > 0; li--) {
    if (split[li] != "") {
      for (var ti = 0; ti < typeMatches.length; ti++) {
        type = typeMatches[ti];
        for (var ri = 0; ri < 9; ri++) {
          rarity = rarityArr[ri];

          //console.log(split[li], split[li].includes(`${rarity} ${type}`), `${rarity} ${type}`);
          if (split[li].includes(`${rarity} ${type}`)) {
            rarityObj.rarity = rarity;
            rarityObj.Itemtype = type;
            return rarityObj;
          }
          if (split[li].includes(`${rarity} DUNGEON ${type}`)) {
            rarityObj.rarity = rarity;
            rarityObj.Itemtype = type;
            rarity.dungeon = true;
            return rarityObj;
          }
        }
      }

      for (var ri = 0; ri < 9; ri++) {
        rarity = rarityArr[ri];
        //console.log(split[li], split[li].includes(`${rarity}`), `${rarity}`);
        if (split[li].includes(`${rarity}`)) {
          rarityObj.rarity = rarity;
          rarityObj.Itemtype = "";
          return rarityObj;
        }
      }
    }
  }

  return rarityObj;
}

async function getKey(itemData, rarityObj) {
  //console.log(itemData)
  key = itemData.key.replaceAll(":", "-");
  //https://github.com/Root3287/NotEnoughUpdates/blob/7c6d37b2eb758a13b342b906f0aef88b940bc52a/src/main/java/io/github/moulberry/notenoughupdates/NEUManager.java#L726
  if (key == "PET") {
    petInfo = JSON.parse(itemData.raw.tag.value.ExtraAttributes.value.petInfo.value);
    if (itemData.raw.tag.value.ExtraAttributes.value.petInfo.value.length > 0) {
      key = petInfo.type;
      tier = petInfo.tier;
      switch (tier) {
        case "COMMON":
          key += ";0";
          break;
        case "UNCOMMON":
          key += ";1";
          break;
        case "RARE":
          key += ";2";
          break;
        case "EPIC":
          key += ";3";
          break;
        case "LEGENDARY":
          key += ";4";
          break;
        case "MYTHIC":
          key += ";5";
          break;
        case "DIVINE":
          key += ";6";
          break;
        case "SPECIAL":
          key += ";7";
          break;
        case "VERY SPECIAL":
          key += ";8";
          break;
      }
    }
  } else {
    switch (rarityObj.rarity) {
      case "COMMON":
        key += ":0";
        break;
      case "UNCOMMON":
        key += ":1";
        break;
      case "RARE":
        key += ":2";
        break;
      case "EPIC":
        key += ":3";
        break;
      case "LEGENDARY":
        key += ":4";
        break;
      case "MYTHIC":
        key += ":5";
        break;
      case "DIVINE":
        key += ":6";
        break;
      case "SPECIAL":
        key += ":7";
        break;
      case "VERY SPECIAL":
        key += ":8";
        break;
    }
  }

  if (itemData.name.includes("⚚")) {
    key = "STARRED_" + key;
  }
  return key;
}

async function getEnchants(desc) {
  desc = desc.toLowerCase();
  levels = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
  };
  ls = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  ls.reverse();
  enchants = {
    Cleave: 6,
    Critical: 7,
    Cubism: 6,
    "Dragon Hunter": 5,
    "Ender Slayer": 7,
    Execute: 6,
    Experience: 5,
    "First Strike": 5,
    "Giant Killer": 7,
    Impaling: 3,
    Lethality: 6,
    "Life Steal": 5,
    Luck: 7,
    "Mana Steal": 3,
    Prosecute: 6,
    Smoldering: 5,
    Syphon: 5,
    Tabasco: 3,
    Thunderbolt: 6,
    "Titan Killer": 7,
    "Triple-Strike": 5,
    Thunderlord: 7,
    Telekinesis: 1,
    Vampirism: 6,
    Venomous: 6,
    Vicious: 5,
    Champion: 10,
    "Divine Gift": 3,
    "Fire Aspect": 3,
    "Ultimate combo": 5,
    Chance: 5,
    Overload: 5,
    Hecatomb: 10,
    "Big Brain": 5,
    "Counter-Strike": 5,
    "Ferocious Mana": 10,
    "Hardened Mana": 10,
    "Mana Vampire": 10,
    Rejuvenate: 5,
    "Strong Mana": 10,
    Respite: 5,
    "Smarty Pants": 5,
    "Sugar Rush": 3,
    Cayenne: 5,
    Prosperity: 5,
    Cultivating: 10,
    Compact: 10,
    Delicate: 5,
    Pristine: 5,
    Replenish: 1,
    "Turbo-Crop": 5,
    Corruption: 5,
    Expertise: 10,
    Frail: 6,
    Piscary: 6,
    "Sugar Rush": 3,
    "True Protection": 1,
    Protection: 6,

    Aiming: 5,
    "Infinite Quiver": 10,
    Snipe: 3,
    Piercing: 1,

    Harvesting: 5,
    Rainbow: 1,
    Replenish: 1,
    "Smelting Touch": 1,

    Angler: 6,
    Blessing: 6,
    Caster: 6,
    Frail: 6,
    Magnet: 6,
    "Spiked Hook": 6,

    Sharpness: 7,
    Smite: 7,
    Looting: 5,
    "Bane of Anthropods": 7,
    Protection: 5,
    Power: 7,
    Efficiency: 5,
    Fortune: 3,
    Lure: 5,
  };

  ultimate_enchants = {
    Bank: 5,
    Chimera: 5,
    Combo: 5,
    Duplex: 5,
    "Fatal Tempo": 5,
    Flash: 5,
    "Habanero Tactics": 5,
    Inferno: 5,
    "Last stand": 5,
    Legion: 5,
    "No pain no gain": 5,
    "One for all": 1,
    Rend: 5,
    "Sould Eater": 5,
    Swarm: 5,
    "Ultimate Jerry": 5,
    "Ultimate wise": 5,
    Wisdom: 5,
  };
  detected = [];

  for (enchant in enchants) {
    for (li in ls) {
      level = ls[li];
      if (desc.includes(`${enchant.toLowerCase()} ${level.toLowerCase()}`)) {
        detected.push({
          enchant: enchant.toLowerCase(),
          level: levels[level],
        });
        //console.log(`${enchant} ${levels[level]}`);
        break;
      }
    }
  }

  for (enchant in ultimate_enchants) {
    for (li in ls) {
      level = ls[li];
      if (desc.includes(`${enchant.toLowerCase()} ${level.toLowerCase()}`)) {
        detected.push({
          enchant: "ultimate " + enchant.toLowerCase(),
          level: levels[level],
        });
        //console.log(`${enchant} ${levels[level]}`);
        break;
      }
    }
  }

  return detected;
}

async function evaluateValue(auction) {
  masterStarsPrice = [0, 7e6, 16e6, 36e6, 70e6, 130e6];

  itemData = await readData(auction);

  auctionPrice = auction.starting_bid / itemData.count;
  rawPrice = auctionPrice;

  if (itemData.valueInformation.isFiveStars == true && auctionPrice > 3e6) {
    rawPrice -= 1e6;
  }
  if (itemData.valueInformation.masterStar > 0) {
    rawPrice -= masterStarsPrice[itemData.valueInformation.masterStar];
  }
  for (let edataindex = 0; edataindex < itemData.valueInformation.enchants.length; edataindex++) {
    let edata = itemData.valueInformation.enchants[edataindex];
    let price = getBzValue(`enchantment ${edata.enchant.toLowerCase()} ${edata.level}`) * 0.75;
    rawPrice -= price;
  }

  reforges = {
    ancient: 450e3,
    withered: 1e6,
    jaded: 2e6,
    spiritual: 1e6,
    stellar: 250e3,
    empowered: 750e3,
  };

  if (reforges[itemData.modifier]) {
    rawPrice -= reforges[itemData.modifier];
  }
  itemData.rawPrice = rawPrice;
  return itemData;
}

async function updateCycle() {
  console.log("Updating prices");
  startingTime = Math.floor(+new Date() / 1000);

  await getBZ();
  bz = JSON.parse(fs.readFileSync("./files/bzar.json", "utf8"));
  await getNEU();
  neu = JSON.parse(fs.readFileSync("./files/neu.json", "utf8"));
  getAH().then(() => {
    statusData = JSON.parse(fs.readFileSync("./files/status.json", "utf8"));
    statusData.lastPricesUpdate = Math.floor(+new Date() / 1000);
    fs.writeFile("./files/status.json", JSON.stringify(statusData), "utf8", () => {
      console.log(`Prices update finished in ${statusData.lastPricesUpdate - startingTime}s`);
    });
  });
}

setInterval(() => {
  updateCycle();
}, 300e3);

updateCycle();
