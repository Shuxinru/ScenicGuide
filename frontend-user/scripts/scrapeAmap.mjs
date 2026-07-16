// Scrape Amap search result coordinates via Playwright
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

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const results = [];

  for (const spotName of spots) {
    console.log(`\nSearching: ${spotName}`);
    const page = await browser.newPage();

    try {
      // Navigate to Amap search
      const url = `https://www.amap.com/search?query=${encodeURIComponent(spotName)}&city=320200`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

      // Wait for search results to render
      await page.waitForTimeout(5000);

      // Get the page URL - Amap often redirects to detail page or updates URL with coords
      const finalUrl = page.url();
      console.log("  URL:", finalUrl);

      // Extract coordinates from the URL parameters or fragment
      let lat = null, lng = null;

      // Pattern 1: Direct lat/lng in URL query
      const urlLat = finalUrl.match(/[?&]lat=([\d.]+)/);
      const urlLng = finalUrl.match(/[?&]lng=([\d.]+)/);
      if (urlLat && urlLng) {
        lat = parseFloat(urlLat[1]);
        lng = parseFloat(urlLng[1]);
      }

      // Pattern 2: Coordinates in the URL path
      if (!lat) {
        const pathLat = finalUrl.match(/\/@([\d.]+),([\d.]+)/);
        if (pathLat) {
          lat = parseFloat(pathLat[1]);
          lng = parseFloat(pathLat[2]);
        }
      }

      // Pattern 3: Look for coordinate data in page HTML source
      if (!lat) {
        const html = await page.content();
        // Look for JSON data with coordinates
        const jsonMatch = html.match(/"location"\s*:\s*\{[^}]*"lat"\s*:\s*([\d.]+)[^}]*"lng"\s*:\s*([\d.]+)/);
        if (jsonMatch) {
          lat = parseFloat(jsonMatch[1]);
          lng = parseFloat(jsonMatch[2]);
        }

        // Try another pattern
        if (!lat) {
          const coordMatch = html.match(/"point"\s*:\s*\{[^}]*"lat"\s*:\s*([\d.]+)[^}]*"lng"\s*:\s*([\d.]+)/);
          if (coordMatch) {
            lat = parseFloat(coordMatch[1]);
            lng = parseFloat(coordMatch[2]);
          }
        }

        // Try __NEXT_DATA__ or similar SSR data
        if (!lat) {
          const ssrMatch = html.match(/__NEXT_DATA__[^<]*"lat"\s*:\s*([\d.]+)[^}]*"lng"\s*:\s*([\d.]+)/);
          if (ssrMatch) {
            lat = parseFloat(ssrMatch[1]);
            lng = parseFloat(ssrMatch[2]);
          }
        }
      }

      // Pattern 4: Try to click first search result and get URL
      if (!lat) {
        // Try clicking the first result
        const firstResult = await page.$("[class*='serp'] [class*='item'], [class*='search'] [class*='item'], [class*='poi'] [class*='item'], .search-item, li[class*='result']");
        if (firstResult) {
          await firstResult.click();
          await page.waitForTimeout(3000);
          const clickUrl = page.url();
          console.log("  Click URL:", clickUrl);
          const clat = clickUrl.match(/[?&]lat=([\d.]+)/);
          const clng = clickUrl.match(/[?&]lng=([\d.]+)/);
          if (clat && clng) {
            lat = parseFloat(clat[1]);
            lng = parseFloat(clng[1]);
          }
        }
      }

      if (lat && lng) {
        console.log(`  COORDS: ${lat}, ${lng}`);
        results.push({ spot: spotName, lat, lng });
      } else {
        // Try to evaluate JavaScript in the page to get coordinates
        const jsCoords = await page.evaluate(() => {
          // Try to access any global state with coordinate data
          const w = window;
          // Check for Amap data stores
          if (w.__AMapData) { return w.__AMapData; }
          // Check URL hash for coordinates
          const hash = w.location.hash;
          const hm = hash.match(/([\d.]+),([\d.]+)/);
          if (hm) return { lat: parseFloat(hm[1]), lng: parseFloat(hm[2]) };
          return null;
        });
        if (jsCoords) {
          console.log(`  JS COORDS: ${jsCoords.lat}, ${jsCoords.lng}`);
          results.push({ spot: spotName, lat: jsCoords.lat, lng: jsCoords.lng });
        } else {
          console.log(`  NOT FOUND`);
          results.push({ spot: spotName, lat: null, lng: null });
        }
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      results.push({ spot: spotName, lat: null, lng: null });
    }

    await page.close();
  }

  console.log("\n=== FINAL RESULTS ===");
  for (const r of results) {
    console.log(`${r.spot}: ${r.lat?.toFixed(5) || "N/A"}, ${r.lng?.toFixed(5) || "N/A"}`);
  }

  fs.writeFileSync(path.resolve(__dirname, "..", "src", "data", "amapCoords.json"), JSON.stringify(results, null, 2));
  console.log("\nSaved!");

  await browser.close();
  process.exit(0);
})();
