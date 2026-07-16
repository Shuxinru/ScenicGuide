import http from "http";
import https from "https";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18900;

const HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Search</title></head>
<body><pre id="out"></pre>
<script>
window._AMapSecurityConfig = { serviceHost: "/_AMapService" };
const s = document.createElement("script");
s.src = "https://webapi.amap.com/maps?v=2.0&key=d1f15ad3fdf0c704434eaf23c7c18698&plugin=AMap.PlaceSearch";
s.onload = function() {
  const queries = [
    "灵山胜境", "灵山大佛景区", "灵山梵宫", "五印坛城", "祥符禅寺",
    "九龙灌浴", "灵山胜境-九龙灌浴", "无锡灵山"
  ];
  const results = [];
  let i = 0;
  function next() {
    if (i >= queries.length) {
      document.getElementById("out").textContent = JSON.stringify(results,null,2);
      return;
    }
    const q = queries[i];
    new AMap.PlaceSearch({city:"无锡",pageSize:10,extensions:"all"}).search(q, function(status, res) {
      if (status==="complete"&&res.pois&&res.pois.length>0) {
        results.push({
          query: q,
          count: res.pois.length,
          pois: res.pois.slice(0,10).map(p=>({
            name:p.name, lat:p.location.lat, lng:p.location.lng,
            address:p.address||"", type:p.type||""
          }))
        });
      } else {
        results.push({query:q, count:0, pois:[]});
      }
      i++; next();
    });
  }
  next();
};
document.head.appendChild(s);
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/_AMapService/")) {
    const targetUrl = "https://restapi.amap.com" + req.url.replace("/_AMapService", "");
    const proxyReq = https.request(targetUrl, {
      method: req.method,
      headers: { ...req.headers, host: "restapi.amap.com" },
    }, (proxyRes) => {
      let body = "";
      proxyRes.on("data", (c) => body += c);
      proxyRes.on("end", () => {
        if (body.includes('"status":"1"')) {
          console.log("API SUCCESS:", targetUrl.substring(0,150));
          console.log("  Body:", body.substring(0,500));
        }
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        res.end(body);
      });
    });
    req.pipe(proxyReq);
  } else {
    res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
    res.end(HTML);
  }
});

server.listen(PORT, async () => {
  console.log(`Server at http://localhost:${PORT}`);
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(30000);
  const json = await page.evaluate(() => document.getElementById("out").textContent);
  const results = JSON.parse(json);

  console.log("\n=== SEARCH RESULTS ===");
  for (const r of results) {
    console.log(`\nQuery "${r.query}": ${r.count} results`);
    for (const p of r.pois) {
      console.log(`  ${p.name}: ${p.lat}, ${p.lng} (${p.address})`);
    }
    if (r.pois.length === 0) console.log("  NO RESULTS");
  }

  fs.writeFileSync(path.resolve(__dirname, "..", "src", "data", "amapCoords.json"), JSON.stringify(results, null, 2));
  await browser.close();
  server.close();
  process.exit(0);
});
