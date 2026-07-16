// Extract GCJ-02 coordinates: One geocode call per evaluate, no nested callbacks
// This avoids "execution context destroyed" from deep callback chains
import { chromium } from "playwright";

const spots = [
  "灵山大照壁", "五明桥", "佛足坛", "五智门", "菩提大道",
  "九龙灌浴", "降魔浮雕", "阿育王柱", "百子戏弥勒", "祥符禅寺",
  "灵山大佛", "佛教文化博览馆", "灵山梵宫", "五印坛城", "曼飞龙塔", "无尽意斋",
];

const allResults = [];

const browser = await chromium.launch({
  headless: true,
  channel: "msedge",
  args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
});

for (const spotName of spots) {
  console.log(`\n=== ${spotName} ===`);

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://www.amap.com/search?query=灵山胜境&city=320200", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(5000);

    // Load plugins
    await page.evaluate(() => {
      return new Promise((resolve) => {
        window.AMap.plugin(["AMap.Geocoder"], () => resolve());
      });
    });
    await page.waitForTimeout(500);

    // Try different search queries — ONE at a time in separate evaluate calls
    const queries = [
      spotName,                         // direct
      `灵山${spotName}`,                // prefix 灵山
      `无锡${spotName}`,                // prefix 无锡
      `灵山胜境${spotName}`,            // prefix 灵山胜境
      spotName.replace("灵山", ""),     // shortened
    ];

    let found = null;

    for (const query of queries) {
      if (!query) continue;
      if (found) break;

      try {
        const result = await page.evaluate((q) => {
          return new Promise((resolve) => {
            try {
              const geocoder = new window.AMap.Geocoder({ city: "无锡" });
              geocoder.getLocation(q, (status, res) => {
                if (status === "complete" && res.geocodes && res.geocodes.length > 0) {
                  const g = res.geocodes[0];
                  resolve({
                    lat: g.location.lat,
                    lng: g.location.lng,
                    address: g.address || "",
                    level: g.level || "",
                    query: q,
                  });
                } else {
                  resolve(null);
                }
              });
            } catch (e) {
              resolve(null);
            }
          });
        }, query);

        if (result) {
          // Validate in Lingshan area
          if (result.lat > 31.41 && result.lat < 31.44 &&
              result.lng > 120.09 && result.lng < 120.12) {
            found = { spot: spotName, ...result, method: query === spotName ? "direct" : `query:${query}` };
          }
        }
      } catch (e) {
        // This query failed, try next
      }
    }

    if (found) {
      console.log(`  FOUND: ${found.lat.toFixed(6)}, ${found.lng.toFixed(6)} (${found.method}, ${found.level})`);
      if (found.address) console.log(`  Addr: ${found.address}`);
      allResults.push(found);
    } else {
      console.log(`  NOT FOUND with any query variation`);
      allResults.push({ spot: spotName, lat: null, lng: null, method: "not_found" });
    }
  } catch (e) {
    console.log(`  PAGE ERROR: ${e.message.substring(0, 150)}`);
    allResults.push({ spot: spotName, lat: null, lng: null, method: "page_error" });
  } finally {
    await page.close();
  }
}

console.log("\n\n========== FINAL RESULTS (GCJ-02) ==========");
let found = 0;
let missing = 0;
for (const r of allResults) {
  if (r.lat !== null) {
    console.log(`{ id: "${r.spot}", lat: ${r.lat.toFixed(6)}, lng: ${r.lng.toFixed(6)} }, // ${r.method}${r.level ? ` (${r.level})` : ""}`);
    found++;
  } else {
    console.log(`// { id: "${r.spot}", lat: 0, lng: 0 }, // NOT FOUND`);
    missing++;
  }
}
console.log(`\nFound: ${found}, Missing: ${missing}`);

console.log("\n=== Raw JSON ===");
console.log(JSON.stringify(allResults, null, 2));

await browser.close();
console.log("\nDone.");
