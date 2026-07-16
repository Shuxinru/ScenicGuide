// Scrape Amap search - interact with amap.com UI directly
import { chromium } from "playwright";

const spots = [
  "灵山大照壁", "五明桥", "佛足坛", "五智门", "菩提大道",
  "九龙灌浴", "降魔浮雕", "阿育王柱", "百子戏弥勒", "祥符禅寺",
  "灵山大佛", "佛教文化博览馆", "灵山梵宫", "五印坛城", "曼飞龙塔", "无尽意斋",
];

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const results = [];

for (const spotName of spots) {
  console.log(`\nSearching: ${spotName}`);
  const page = await browser.newPage();

  page.on("response", async (resp) => {
    const url = resp.url();
    if (url.includes("poi") || url.includes("place") || url.includes("detail") || url.includes("search")) {
      try {
        const body = await resp.text();
        if (body.includes('"lat"') || body.includes('"lng"') || body.includes('"longitude"')) {
          console.log("  API:", url.substring(0, 120), body.substring(0, 300));
        }
      } catch {}
    }
  });

  const searchUrl = `https://www.amap.com/search?query=${encodeURIComponent(spotName)}&city=320200`;
  await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);

  const coords = await page.evaluate(() => {
    const url = window.location.href;
    const latMatch = url.match(/[?&]lat=([\d.]+)/);
    const lngMatch = url.match(/[?&]lng=([\d.]+)/);
    if (latMatch && lngMatch) {
      return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) };
    }
    return null;
  });

  if (coords) {
    console.log(`  Found: ${coords.lat}, ${coords.lng}`);
    results.push({ spot: spotName, lat: coords.lat, lng: coords.lng });
  } else {
    console.log("  No coords");
    results.push({ spot: spotName, lat: null, lng: null });
  }

  await page.close();
}

console.log("\n=== RESULTS ===");
console.log(JSON.stringify(results, null, 2));
await browser.close();
