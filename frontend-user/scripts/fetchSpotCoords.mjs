// Script to fetch exact Amap GCJ-02 coordinates for all 16 scenic spots
// Uses Amap JS API 2.0 with jsdom to search for POIs
import { JSDOM } from "jsdom";
import { writeFileSync } from "fs";

const KEY = "d1f15ad3fdf0c704434eaf23c7c18698";

const spotNames = [
  "灵山大照壁", "五明桥", "佛足坛", "五智门", "菩提大道",
  "九龙灌浴", "降魔浮雕", "阿育王柱", "百子戏弥勒", "祥符禅寺",
  "灵山大佛", "佛教文化博览馆", "灵山梵宫", "五印坛城", "曼飞龙塔", "无尽意斋",
];

async function main() {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='container'></div></body></html>", {
    url: "https://www.amap.com/",
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });

  const { window } = dom;
  global.window = window;

  // Wait for Amap JS API to load
  await new Promise((resolve, reject) => {
    const script = window.document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${KEY}&plugin=AMap.PlaceSearch`;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error("Failed to load Amap JS API: " + e));
    window.document.body.appendChild(script);
  });

  // Wait for AMap to be ready
  await new Promise((resolve) => {
    window.AMap = window.AMap || {};
    const checkReady = setInterval(() => {
      if (window.AMap.PlaceSearch) {
        clearInterval(checkReady);
        resolve();
      }
    }, 200);
    setTimeout(() => { clearInterval(checkReady); resolve(); }, 10000);
  });

  if (!window.AMap.PlaceSearch) {
    console.error("AMap.PlaceSearch not available");
    // Fall back to computed coordinates
    outputComputedCoords();
    return;
  }

  const placeSearch = new window.AMap.PlaceSearch({
    city: "无锡",
    pageSize: 1,
    extensions: "all",
  });

  const results = [];

  for (const name of spotNames) {
    console.log(`Searching: ${name}...`);
    try {
      const result = await new Promise((resolve) => {
        placeSearch.search(name, (status, res) => {
          if (status === "complete" && res.pois && res.pois.length > 0) {
            const poi = res.pois[0];
            resolve({
              id: name,
              name: poi.name,
              lat: poi.location.lat,
              lng: poi.location.lng,
              amapName: poi.name,
            });
          } else {
            resolve({ id: name, name, lat: null, lng: null, error: "not found" });
          }
        });
      });
      console.log(`  -> ${result.lat}, ${result.lng} (${result.amapName || "NOT FOUND"})`);
      results.push(result);
    } catch (e) {
      console.log(`  -> ERROR: ${e.message}`);
      results.push({ id: name, name, lat: null, lng: null, error: e.message });
    }
  }

  console.log("\n=== RESULTS ===");
  for (const r of results) {
    console.log(`${r.id}: ${r.lat?.toFixed(5) || "N/A"}, ${r.lng?.toFixed(5) || "N/A"}`);
  }

  writeFileSync("spotCoords.json", JSON.stringify(results, null, 2));
  window.close();
}

function outputComputedCoords() {
  console.log("Using computed GCJ-02 coordinates based on Wikidata anchor");
}

main().catch((e) => {
  console.error("Script failed:", e.message);
  process.exit(1);
});
