// Use Amap's official demo pages which have working API keys on their domain
// Execute PlaceSearch via the already-loaded Amap JS API on lbs.amap.com
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

  // Open the Amap POI search demo page which has the API already loaded
  const demoUrl = "https://lbs.amap.com/api/javascript-api/example/poi-search/poi-search";
  console.log("Loading demo page:", demoUrl);

  const page = await browser.newPage();

  // Log console messages from the page
  page.on("console", (msg) => {
    if (msg.text().includes("31.") || msg.text().includes("result") || msg.text().includes("Found")) {
      console.log("PAGE:", msg.text().substring(0, 200));
    }
  });

  await page.goto(demoUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check if AMap is available
  const amapReady = await page.evaluate(() => {
    return typeof window.AMap !== "undefined" && typeof window.AMap.PlaceSearch !== "undefined";
  });
  console.log("AMap ready:", amapReady);

  if (!amapReady) {
    console.log("AMap not available on demo page, trying alternative...");
    await page.close();

    // Alternative: try loading from a simple hosted page
    // Let's try the Amap getting-started demo
    const page2 = await browser.newPage();
    await page2.goto("https://lbs.amap.com/api/javascript-api/example/map-lifecycle/map-show", {
      waitUntil: "networkidle", timeout: 30000
    });
    await page2.waitForTimeout(3000);

    const amapReady2 = await page2.evaluate(() => {
      return typeof window.AMap !== "undefined";
    });
    console.log("AMap ready (alt):", amapReady2);

    if (amapReady2) {
      // Load the PlaceSearch plugin
      await page2.evaluate(() => {
        return new Promise((resolve, reject) => {
          window.AMap.plugin("AMap.PlaceSearch", function() {
            resolve(true);
          }, function(e) {
            reject(e);
          });
        });
      });
      console.log("PlaceSearch plugin loaded");

      for (const spotName of spots) {
        console.log(`\nSearching: ${spotName}`);
        try {
          const result = await page2.evaluate((name) => {
            return new Promise((resolve) => {
              const ps = new window.AMap.PlaceSearch({ city: "无锡", pageSize: 10 });
              ps.search(name, function(status, res) {
                if (status === "complete" && res.pois && res.pois.length > 0) {
                  // Find exact or closest match
                  for (const p of res.pois) {
                    if (p.name === name || p.name.includes(name) || name.includes(p.name)) {
                      resolve({
                        spot: name,
                        lat: p.location.lat,
                        lng: p.location.lng,
                        amapName: p.name,
                        address: p.address,
                      });
                      return;
                    }
                  }
                  // Use first result
                  resolve({
                    spot: name,
                    lat: res.pois[0].location.lat,
                    lng: res.pois[0].location.lng,
                    amapName: res.pois[0].name,
                    address: res.pois[0].address,
                  });
                } else {
                  resolve({ spot: name, lat: null, lng: null, amapName: "NOT FOUND" });
                }
              });
            });
          }, spotName);
          console.log(`  ${result.lat}, ${result.lng} (${result.amapName})`);
          results.push(result);
        } catch (e) {
          console.log(`  Error: ${e.message}`);
          results.push({ spot: spotName, lat: null, lng: null });
        }
      }
    }
    await page2.close();
  } else {
    // PlaceSearch already available on the demo page
    for (const spotName of spots) {
      console.log(`\nSearching: ${spotName}`);
      try {
        const result = await page.evaluate((name) => {
          return new Promise((resolve) => {
            const ps = new window.AMap.PlaceSearch({ city: "无锡", pageSize: 10 });
            ps.search(name, function(status, res) {
              if (status === "complete" && res.pois && res.pois.length > 0) {
                for (const p of res.pois) {
                  if (p.name === name || p.name.includes(name) || name.includes(p.name)) {
                    resolve({
                      spot: name,
                      lat: p.location.lat,
                      lng: p.location.lng,
                      amapName: p.name,
                      address: p.address,
                    });
                    return;
                  }
                }
                resolve({
                  spot: name,
                  lat: res.pois[0].location.lat,
                  lng: res.pois[0].location.lng,
                  amapName: res.pois[0].name,
                  address: res.pois[0].address,
                });
              } else {
                resolve({ spot: name, lat: null, lng: null, amapName: "NOT FOUND" });
              }
            });
          });
        }, spotName);
        console.log(`  ${result.lat}, ${result.lng} (${result.amapName})`);
        results.push(result);
      } catch (e) {
        console.log(`  Error: ${e.message}`);
        results.push({ spot: spotName, lat: null, lng: null });
      }
    }
    await page.close();
  }

  console.log("\n\n=== FINAL RESULTS ===");
  for (const r of results) {
    console.log(`${r.spot}: ${r.lat?.toFixed(6) || "N/A"}, ${r.lng?.toFixed(6) || "N/A"} (${r.amapName || "N/A"})`);
  }

  const outPath = path.resolve(__dirname, "..", "src", "data", "amapCoords.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outPath}`);

  await browser.close();
}

main().catch(console.error);
