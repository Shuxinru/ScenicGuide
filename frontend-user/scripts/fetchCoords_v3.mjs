// Use Amap POI detail pages to get coordinates
// Each POI on amap.com has a detail page that may contain coordinates
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getPoiFromSearch(page, spotName) {
  // Use the Amap search suggestion API (different from place search)
  const suggestUrl = `https://restapi.amap.com/v3/assistant/inputtips?key=d1f15ad3fdf0c704434eaf23c7c18698&keywords=${encodeURIComponent(spotName)}&city=无锡`;
  try {
    const resp = await page.evaluate(async (url) => {
      const r = await fetch(url);
      return await r.json();
    }, suggestUrl);
    if (resp.tips && resp.tips.length > 0) {
      const tip = resp.tips[0];
      console.log(`  Input tip: ${tip.name}, district: ${tip.district}`);
      if (tip.location) {
        return { lat: tip.location.lat, lng: tip.location.lng };
      }
      return { tipName: tip.name, tipId: tip.id };
    }
  } catch (e) {
    console.log(`  Suggest API error: ${e.message}`);
  }
  return null;
}

async function getPoiFromDetail(page, spotName) {
  // Try to search and click through to POI detail
  const searchUrl = `https://www.amap.com/search?query=${encodeURIComponent(spotName)}`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(6000);

  // Try to get coordinates from the page context
  const coords = await page.evaluate(() => {
    // Check if Amap has stored any data
    const scripts = Array.from(document.querySelectorAll("script"));
    for (const s of scripts) {
      if (s.textContent) {
        const m = s.textContent.match(/(?:location|point|center)\s*:\s*\{[^}]*?(?:lat|lng)[^}]*\}/);
        if (m) return m[0];
      }
    }
    // Check all text content for coordinate patterns near 灵山 area
    const bodyText = document.body.innerText;
    const coordPattern = /(31\.\d{4,})[\s\S]{0,20}(120\.\d{4,})/;
    const m = bodyText.match(coordPattern);
    if (m) return `lat:${m[1]}, lng:${m[2]}`;
    return null;
  });

  if (coords) {
    console.log(`  Page coord data: ${coords.substring(0, 100)}`);
  }

  // Try clicking first result
  const clickSelectors = [
    "a[href*='/place/']", "[data-index='0']", ".search-item:first-child",
    "[class*='poi']:first-child a", "[class*='result']:first-child",
  ];
  for (const sel of clickSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const href = await el.getAttribute("href");
        console.log(`  Found element: ${sel}, href: ${href}`);
        if (href && href.includes("/place/")) {
          // Navigate directly to POI detail
          const detailUrl = href.startsWith("http") ? href : `https://www.amap.com${href}`;
          console.log(`  Going to detail: ${detailUrl.substring(0, 100)}`);
          await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForTimeout(5000);
          const detailUrl2 = page.url();
          console.log(`  Detail URL: ${detailUrl2.substring(0, 150)}`);
          const latM = detailUrl2.match(/[?&]lat=([\d.]+)/);
          const lngM = detailUrl2.match(/[?&]lng=([\d.]+)/);
          if (latM && lngM) {
            return { lat: parseFloat(latM[1]), lng: parseFloat(lngM[1]) };
          }
        }
        break;
      }
    } catch (_) {}
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const context = await browser.newContext();
  const page = await context.newPage();

  // First, intercept ALL network requests to find the POI data
  const poiData = [];
  page.on("response", async (resp) => {
    const url = resp.url();
    if (url.includes("/detail/") || url.includes("poi") || url.includes("place") || url.includes("getPoi")) {
      try {
        const ct = resp.headers()["content-type"] || "";
        if (ct.includes("json")) {
          const text = await resp.text();
          if (text.includes("31.") && text.includes("120.")) {
            poiData.push({ url: url.substring(0, 150), snippet: text.substring(0, 500) });
          }
        }
      } catch(_) {}
    }
  });

  // Search for 灵山大佛 - the most well-known spot
  const searchUrl = `https://www.amap.com/search?query=${encodeURIComponent("灵山胜境")}`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(10000);

  console.log("Final URL:", page.url());

  // Log all collected network data
  console.log(`\nCollected ${poiData.length} network responses with coordinates`);
  for (const d of poiData.slice(0, 5)) {
    console.log("URL:", d.url.substring(0, 100));
    console.log("Data:", d.snippet.substring(0, 300));
    console.log("---");
  }

  // Also dump any scripts containing coordinates
  const scriptData = await page.evaluate(() => {
    const results = [];
    const scripts = Array.from(document.querySelectorAll("script"));
    for (const s of scripts) {
      const text = s.textContent || "";
      if (text.includes("120.") && text.includes("31.")) {
        // Find the coordinate context
        const idx = text.indexOf("120.");
        const start = Math.max(0, idx - 100);
        const end = Math.min(text.length, idx + 100);
        results.push(text.substring(start, end));
      }
    }
    return results;
  });
  console.log(`\nFound ${scriptData.length} script blocks with coordinates`);
  for (const s of scriptData.slice(0, 10)) {
    console.log(s.substring(0, 200));
    console.log("---");
  }

  await context.close();
  await browser.close();
}

main().catch(console.error);
