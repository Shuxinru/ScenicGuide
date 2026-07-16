import http from "http";
import https from "https";
import zlib from "zlib";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18902;

const HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body><pre id="out"></pre>
<script>
window._AMapSecurityConfig = { serviceHost: "/_AMapService" };
var s = document.createElement("script");
s.src = "https://webapi.amap.com/maps?v=2.0&key=d1f15ad3fdf0c704434eaf23c7c18698&plugin=AMap.PlaceSearch";
s.onload = function() {
  var results = [];
  // Try fewer, simpler queries
  var queries = ["灵山胜境", "灵山", "灵山大佛"];
  var i = 0;
  function next() {
    if (i >= queries.length) {
      document.getElementById("out").textContent = JSON.stringify(results, null, 2);
      return;
    }
    var q = queries[i];
    new AMap.PlaceSearch({city:"无锡", pageSize:10}).search(q, function(status, res) {
      var entry = {query: q, status: status, count: res&&res.pois?res.pois.length:0, pois:[]};
      if (res && res.pois) {
        for (var j=0; j<res.pois.length; j++) {
          entry.pois.push({name:res.pois[j].name, lat:res.pois[j].location.lat, lng:res.pois[j].location.lng});
        }
      }
      results.push(entry);
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
    const headers = { ...req.headers, host: "restapi.amap.com" };
    delete headers["accept-encoding"];

    const proxyReq = https.request(targetUrl, { method: req.method, headers }, (proxyRes) => {
      const resHeaders = { ...proxyRes.headers };
      delete resHeaders["content-encoding"];
      delete resHeaders["transfer-encoding"];

      let stream = proxyRes;
      const enc = proxyRes.headers["content-encoding"];
      if (enc === "gzip") stream = proxyRes.pipe(zlib.createGunzip());
      else if (enc === "deflate") stream = proxyRes.pipe(zlib.createInflate());

      let body = "";
      stream.on("data", (c) => body += c);
      stream.on("end", () => {
        if (targetUrl.includes("place/text")) {
          console.log("API Response:", body.substring(0, 600));
        }
        res.writeHead(proxyRes.statusCode, resHeaders);
        res.end(body);
      });
    });
    proxyReq.on("error", (e) => { res.writeHead(502); res.end(e.message); });
    req.pipe(proxyReq);
  } else {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
  }
});

server.listen(PORT, async () => {
  console.log(`Server at ${PORT}`);
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log(">", msg.text().substring(0, 200)));
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(20000);
  const text = await page.evaluate(() => document.getElementById("out")?.textContent || "NO DATA");
  console.log("\n=== RESULTS ===");
  console.log(text.substring(0, 5000));

  try {
    const results = JSON.parse(text);
    fs.writeFileSync(path.resolve(__dirname, "..", "src", "data", "amapCoords.json"), JSON.stringify(results, null, 2));
  } catch(e) {}

  await browser.close();
  server.close();
  process.exit(0);
});
