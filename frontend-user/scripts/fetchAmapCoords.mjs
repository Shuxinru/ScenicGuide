// Self-contained: HTTP server + Playwright browser = Amap POI coordinates
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18899;

const HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Search</title></head>
<body><div id="status">Loading...</div><pre id="out"></pre>
<script>
window._AMapSecurityConfig = { serviceHost: "/_AMapService" };
const s = document.createElement("script");
s.src = "https://webapi.amap.com/maps?v=2.0&key=d1f15ad3fdf0c704434eaf23c7c18698&plugin=AMap.PlaceSearch";
s.onload = function() {
  document.getElementById("status").textContent = "API loaded, searching...";
  const spots = ["灵山大照壁","五明桥","佛足坛","五智门","菩提大道","九龙灌浴","降魔浮雕","阿育王柱","百子戏弥勒","祥符禅寺","灵山大佛","佛教文化博览馆","灵山梵宫","五印坛城","曼飞龙塔","无尽意斋"];
  const results = [];
  let i = 0;
  function next() {
    if (i >= spots.length) {
      document.getElementById("out").textContent = JSON.stringify(results);
      document.getElementById("status").textContent = "DONE";
      return;
    }
    const name = spots[i];
    new AMap.PlaceSearch({ city: "无锡", pageSize: 5 }).search(name, function(status, res) {
      if (status === "complete" && res.pois && res.pois.length > 0) {
        for (const p of res.pois) {
          if (p.name === name || p.name.includes(name) || name.includes(p.name)) {
            results.push({spot:name, lat:p.location.lat, lng:p.location.lng, amap:p.name});
            i++; next(); return;
          }
        }
        results.push({spot:name, lat:res.pois[0].location.lat, lng:res.pois[0].location.lng, amap:res.pois[0].name});
      } else {
        results.push({spot:name, lat:null, lng:null, amap:"NOT_FOUND"});
      }
      i++; next();
    });
  }
  next();
};
document.head.appendChild(s);
</script></body></html>`;

// Start HTTP server
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(HTML);
});

server.listen(PORT, async () => {
  console.log(`Server at http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true, channel: "msedge" });
    const page = await browser.newPage();

    page.on("console", (msg) => {
      if (!msg.text().includes("ERR_") && !msg.text().includes("net::")) {
        console.log(">", msg.text().substring(0, 200));
      }
    });

    await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for the results
    await page.waitForFunction(() => {
      const status = document.getElementById("status");
      return status && status.textContent === "DONE";
    }, { timeout: 120000 });

    const json = await page.evaluate(() => document.getElementById("out").textContent);
    const results = JSON.parse(json);

    console.log("\n=== AMAP GCJ-02 COORDINATES ===");
    for (const r of results) {
      console.log(`${r.spot}: ${r.lat?.toFixed(5) || "N/A"}, ${r.lng?.toFixed(5) || "N/A"}  (${r.amap})`);
    }

    // Save to file
    fs.writeFileSync(path.resolve(__dirname, "..", "src", "data", "amapCoords.json"), JSON.stringify(results, null, 2));
    console.log("\nSaved to src/data/amapCoords.json");

    await browser.close();
  } catch (e) {
    console.error("Error:", e.message);
  }

  server.close();
  process.exit(0);
});
