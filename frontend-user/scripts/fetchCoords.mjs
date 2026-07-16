// Fetch exact GCJ-02 coordinates from Amap POI search using Playwright
const { chromium } = require("playwright");
const fs = require("fs");

const spotNames = [
  "灵山大照壁", "五明桥", "佛足坛", "五智门", "菩提大道",
  "九龙灌浴", "降魔浮雕", "阿育王柱", "百子戏弥勒", "祥符禅寺",
  "灵山大佛", "佛教文化博览馆", "灵山梵宫", "五印坛城", "曼飞龙塔", "无尽意斋",
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];

  for (const spotName of spotNames) {
    console.log(`Searching: ${spotName}`);
    try {
      // Navigate to Amap search for this spot
      const searchUrl = `https://www.amap.com/search?query=${encodeURIComponent(spotName)}&city=320200`;
      await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });

      // Wait for search results to load
      await page.waitForTimeout(3000);

      // Extract coordinates from the page
      // Amap search results contain coordinate data in the page state
      const coords = await page.evaluate(() => {
        // Try to get coordinates from the URL after redirect
        const url = window.location.href;
        // Amap POI detail URLs contain coordinates: /place/...?lat=...&lng=...
        const latMatch = url.match(/lat=([\d.]+)/);
        const lngMatch = url.match(/lng=([\d.]+)/);

        // Try to get from page data
        const scripts = document.querySelectorAll("script");
        for (const s of scripts) {
          const text = s.textContent || "";
          // Look for coordinate patterns in scripts
          const match = text.match(/"location"\s*:\s*\{\s*"lat"\s*:\s*([\d.]+)\s*,\s*"lng"\s*:\s*([\d.]+)\s*\}/);
          if (match) {
            return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
          }
        }

        // Try to get from search result list
        const poiItems = document.querySelectorAll("[data-lat], [data-lng]");
        if (poiItems.length > 0) {
          const el = poiItems[0];
          const lat = parseFloat(el.getAttribute("data-lat") || "0");
          const lng = parseFloat(el.getAttribute("data-lng") || "0");
          if (lat && lng) return { lat, lng };
        }

        return null;
      });

      if (coords) {
        console.log(`  -> GCJ-02: ${coords.lat}, ${coords.lng}`);
        results.push({ id: spotName, name: spotName, lat: coords.lat, lng: coords.lng });
      } else {
        // Try clicking on the first search result to get the detail page
        const firstResult = await page.$(".search-result-item, .poi-item, [class*='result']");
        if (firstResult) {
          await firstResult.click();
          await page.waitForTimeout(3000);
          const detailUrl = page.url();
          const latMatch = detailUrl.match(/lat=([\d.]+)/);
          const lngMatch = detailUrl.match(/lng=([\d.]+)/);
          if (latMatch && lngMatch) {
            const lat = parseFloat(latMatch[1]);
            const lng = parseFloat(lngMatch[1]);
            console.log(`  -> GCJ-02 (from detail): ${lat}, ${lng}`);
            results.push({ id: spotName, name: spotName, lat, lng });
          } else {
            console.log(`  -> NOT FOUND`);
            results.push({ id: spotName, name: spotName, lat: null, lng: null });
          }
        } else {
          console.log(`  -> NOT FOUND`);
          results.push({ id: spotName, name: spotName, lat: null, lng: null });
        }
      }
    } catch (e) {
      console.log(`  -> ERROR: ${e.message}`);
      results.push({ id: spotName, name: spotName, lat: null, lng: null });
    }
  }

  console.log("\n=== ALL RESULTS ===");
  for (const r of results) {
    console.log(`${r.id}: ${r.lat?.toFixed(5) || "N/A"}, ${r.lng?.toFixed(5) || "N/A"}`);
  }

  fs.writeFileSync("spotCoords_from_amap.json", JSON.stringify(results, null, 2));
  console.log("\nSaved to spotCoords_from_amap.json");

  await browser.close();
})();
