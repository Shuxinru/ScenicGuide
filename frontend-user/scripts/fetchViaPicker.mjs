// Use Amap's official coordinate picker (lbs.amap.com/tools/picker)
// The Amap JS API works on this domain
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const spots = [
  "灵山大照壁", "五明桥", "佛足坛", "五智门", "菩提大道",
  "九龙灌浴", "降魔浮雕", "阿育王柱", "百子戏弥勒", "祥符禅寺",
  "灵山大佛", "佛教文化博览馆", "灵山梵宫", "五印坛城", "曼飞龙塔", "无尽意斋",
];

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const results = [];

  // Open the Amap coordinate picker
  const page = await browser.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("ERROR") || text.includes("error") || text.includes("FAIL")) {
      console.log("PAGE ERR:", text.substring(0, 150));
    }
    if (text.includes("__COORD__")) {
      console.log("COORD:", text.substring(0, 200));
    }
  });

  const pickerUrl = "https://lbs.amap.com/tools/picker";
  console.log("Loading coordinate picker:", pickerUrl);
  await page.goto(pickerUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log("Final URL:", page.url().substring(0, 120));

  // Check if AMap is available
  const hasAMap = await page.evaluate(() => {
    return !!(window.AMap && window.AMap.PlaceSearch);
  });
  console.log("AMap.PlaceSearch available:", hasAMap);

  // If AMap is not directly available, try to load it
  if (!hasAMap) {
    console.log("Trying to load AMap via script injection...");
    const loaded = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check if AMap already loaded under a different global
        if (window.AMap && window.AMap.PlaceSearch) {
          resolve(true);
          return;
        }
        // Try loading via the page's existing AMap instance
        if (window.AMap) {
          window.AMap.plugin("AMap.PlaceSearch", () => {
            resolve(true);
          });
        } else {
          resolve(false);
        }
      });
    });
    console.log("AMap loaded:", loaded);
  }

  // Now try to search for spots
  const hasPlaceSearch = await page.evaluate(() => {
    return !!(window.AMap && window.AMap.PlaceSearch);
  });

  if (hasPlaceSearch) {
    console.log("\nSearching for spots via AMap.PlaceSearch...");
    for (const spotName of spots) {
      try {
        const result = await page.evaluate((name) => {
          return new Promise((resolve) => {
            try {
              const ps = new window.AMap.PlaceSearch({
                city: "无锡",
                pageSize: 10,
              });
              ps.search(name, function(status, res) {
                if (status === "complete" && res.pois && res.pois.length > 0) {
                  // Find best match
                  for (const p of res.pois) {
                    if (p.name === name || p.name.includes(name) || name.includes(p.name)) {
                      resolve({
                        spot: name,
                        lat: p.location.lat,
                        lng: p.location.lng,
                        amapName: p.name,
                        address: p.address || "",
                      });
                      return;
                    }
                  }
                  resolve({
                    spot: name,
                    lat: res.pois[0].location.lat,
                    lng: res.pois[0].location.lng,
                    amapName: res.pois[0].name,
                    address: res.pois[0].address || "",
                  });
                } else {
                  resolve({ spot: name, lat: null, lng: null, amapName: "NOT FOUND" });
                }
              });
            } catch(e) {
              resolve({ spot: name, lat: null, lng: null, amapName: "ERROR: " + e.message });
            }
          });
        }, spotName);
        console.log(`  ${result.spot}: ${result.lat?.toFixed(6) || "N/A"}, ${result.lng?.toFixed(6) || "N/A"} (${result.amapName})`);
        results.push(result);
      } catch (e) {
        console.log(`  ${spotName}: ERROR - ${e.message}`);
        results.push({ spot: spotName, lat: null, lng: null });
      }
    }
  } else {
    // Fallback: try to use the page's search box and read results
    console.log("AMap.PlaceSearch not available, trying UI interaction...");

    // Find the search input on the picker page
    const searchInput = await page.$("input[type='text'], input[placeholder*='搜索'], input[id*='search'], #txtSearch");
    if (searchInput) {
      console.log("Found search input");
    } else {
      console.log("No search input found");
      // Take a screenshot to debug
      await page.screenshot({ path: path.resolve(__dirname, "picker_debug.png") });
      console.log("Screenshot saved");
    }
  }

  // Also try to get coordinates by directly fetching Amap internal API
  console.log("\n\n=== Trying internal API ===");
  for (const spotName of spots.slice(0, 3)) {
    try {
      const apiResult = await page.evaluate(async (name) => {
        try {
          // Try the Amap search suggest API
          const resp = await fetch(
            `https://www.amap.com/suggest?query=${encodeURIComponent(name)}&city=320200&citylimit=true`
          );
          const data = await resp.json();
          return JSON.stringify(data).substring(0, 500);
        } catch(e) {
          return "Error: " + e.message;
        }
      }, spotName);
      console.log(`  ${spotName} suggest:`, apiResult);
    } catch(e) {
      console.log(`  ${spotName} error:`, e.message);
    }
  }

  console.log("\n\n=== FINAL RESULTS ===");
  for (const r of results) {
    console.log(`${r.spot}: ${r.lat?.toFixed(6) || "N/A"}, ${r.lng?.toFixed(6) || "N/A"}  (${r.amapName || ""})`);
  }

  const outPath = path.resolve(__dirname, "..", "src", "data", "amapCoords.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outPath}`);

  await browser.close();
}

main().catch(console.error);
