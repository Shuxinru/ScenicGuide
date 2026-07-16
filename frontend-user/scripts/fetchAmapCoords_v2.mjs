// Robust Amap coordinate scraper using Playwright
// Uses the Amap search page and extracts coordinates from network responses and page state

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

async function scrapeAmap() {
  const browser = await chromium.launch({
    headless: true,
    channel: "msedge",
  });

  const results = [];

  for (const spotName of spots) {
    console.log(`\n=== Searching: ${spotName} ===`);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect XHR/Fetch responses that might contain coordinates
    const networkData = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("poi") || url.includes("search") || url.includes("detail") || url.includes("place")) {
        try {
          const ct = response.headers()["content-type"] || "";
          if (ct.includes("json") || ct.includes("javascript")) {
            const text = await response.text();
            if (text.includes('"lat"') || text.includes('"lng"') || text.includes('"longitude"')) {
              networkData.push({ url: url.substring(0, 120), text: text.substring(0, 2000) });
            }
          }
        } catch (_) {}
      }
    });

    try {
      // Try approach 1: Amap search page
      const searchUrl = `https://www.amap.com/search?query=${encodeURIComponent(spotName)}`;
      console.log("  Loading search page...");
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait for the SPA to render
      await page.waitForTimeout(8000);

      // Check final URL - may contain coordinates
      const finalUrl = page.url();
      console.log("  Final URL:", finalUrl.substring(0, 150));

      // Try to extract from URL patterns
      let lat = null, lng = null;

      // Pattern: direct lat/lng params
      const urlLat = finalUrl.match(/[?&]lat=([\d.]+)/);
      const urlLng = finalUrl.match(/[?&]lng=([\d.]+)/);
      if (urlLat && urlLng) {
        lat = parseFloat(urlLat[1]);
        lng = parseFloat(urlLng[1]);
        console.log(`  Found in URL: ${lat}, ${lng}`);
      }

      // Pattern: coordinates in URL path @lat,lng
      if (!lat) {
        const pathCoord = finalUrl.match(/@([\d.]+),([\d.]+)/);
        if (pathCoord) {
          lat = parseFloat(pathCoord[1]);
          lng = parseFloat(pathCoord[2]);
          console.log(`  Found in URL path: ${lat}, ${lng}`);
        }
      }

      // Try to extract from page JavaScript state
      if (!lat) {
        const jsData = await page.evaluate(() => {
          const data = {};
          // Try to access common Amap data stores
          try {
            if (window.__AMapData) data.amapData = window.__AMapData;
          } catch(_) {}
          try {
            // Try accessing React fiber/state
            const root = document.getElementById("root") || document.querySelector("[class*='app']") || document.body;
            if (root && root._reactRootContainer) {
              data.reactRoot = "found";
            }
          } catch(_) {}
          return JSON.stringify(data);
        });
        console.log("  JS data:", jsData.substring(0, 200));
      }

      // Try to extract from HTML
      if (!lat) {
        const html = await page.content();

        // Look for JSON-LD or structured data
        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
        if (jsonLdMatch) {
          try {
            const ld = JSON.parse(jsonLdMatch[1]);
            console.log("  JSON-LD:", JSON.stringify(ld).substring(0, 200));
            if (ld.geo) {
              lat = ld.geo.latitude;
              lng = ld.geo.longitude;
            }
          } catch(_) {}
        }

        // Look for coordinate data in inline scripts
        if (!lat) {
          const coordPatterns = [
            /"lat"\s*:\s*([\d.]+)[\s\S]{0,100}?"lng"\s*:\s*([\d.]+)/,
            /"latitude"\s*:\s*([\d.]+)[\s\S]{0,100}?"longitude"\s*:\s*([\d.]+)/,
            /location\s*:\s*\[([\d.]+)\s*,\s*([\d.]+)\]/,
            /center\s*:\s*\[([\d.]+)\s*,\s*([\d.]+)\]/,
          ];
          for (const pat of coordPatterns) {
            const m = html.match(pat);
            if (m) {
              lat = parseFloat(m[1]);
              lng = parseFloat(m[2]);
              console.log(`  Found in HTML: ${lat}, ${lng}`);
              break;
            }
          }
        }
      }

      // Try to extract from network responses
      if (!lat && networkData.length > 0) {
        console.log(`  Got ${networkData.length} network responses with coords`);
        for (const nd of networkData) {
          console.log("  URL:", nd.url);
          const m = nd.text.match(/"lat"\s*:\s*([\d.]+)[\s\S]{0,200}?"lng"\s*:\s*([\d.]+)/);
          if (m) {
            lat = parseFloat(m[1]);
            lng = parseFloat(m[2]);
            console.log(`  Found in network: ${lat}, ${lng}`);
            break;
          }
        }
      }

      // Approach 2: Click first search result to get detail page
      if (!lat) {
        console.log("  Trying to click first result...");
        const clickTargets = [
          "[class*='poi-item']", "[class*='search-item']", "[class*='serp-item']",
          "li[class*='result']", ".poi-list > li", "[class*='list-item']",
          "a[href*='place']", "[class*='result-item']",
        ];
        for (const sel of clickTargets) {
          const el = await page.$(sel);
          if (el) {
            console.log(`  Found element: ${sel}`);
            await el.click();
            await page.waitForTimeout(4000);
            const clickUrl = page.url();
            console.log("  Click URL:", clickUrl.substring(0, 150));
            const clat = clickUrl.match(/[?&]lat=([\d.]+)/);
            const clng = clickUrl.match(/[?&]lng=([\d.]+)/);
            if (clat && clng) {
              lat = parseFloat(clat[1]);
              lng = parseFloat(clng[1]);
              console.log(`  Found after click: ${lat}, ${lng}`);
            }
            break;
          }
        }
      }

      // Store result
      if (lat && lng) {
        results.push({ spot: spotName, lat, lng, source: "amap_search" });
      } else {
        results.push({ spot: spotName, lat: null, lng: null, source: null });
      }

    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      results.push({ spot: spotName, lat: null, lng: null, source: null });
    }

    await context.close();
  }

  console.log("\n\n=== FINAL RESULTS ===");
  for (const r of results) {
    console.log(`${r.spot}: ${r.lat?.toFixed(6) || "N/A"}, ${r.lng?.toFixed(6) || "N/A"}`);
  }

  const outPath = path.resolve(__dirname, "..", "src", "data", "amapCoords.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outPath}`);

  await browser.close();
}

scrapeAmap().catch(console.error);
