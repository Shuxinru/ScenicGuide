// Debug: capture full API responses
import http from "http";
import https from "https";
import { chromium } from "playwright";

const PORT = 18901;
let apiCallCount = 0;

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/_AMapService/")) {
    apiCallCount++;
    const targetUrl = "https://restapi.amap.com" + req.url.replace("/_AMapService", "");
    console.log(`\n[${apiCallCount}] ${req.method} ${targetUrl.substring(0, 200)}`);

    const proxyReq = https.request(targetUrl, {
      method: req.method,
      headers: { ...req.headers, host: "restapi.amap.com" },
    }, (proxyRes) => {
      let body = "";
      proxyRes.on("data", (c) => body += c);
      proxyRes.on("end", () => {
        console.log(`  Status: ${proxyRes.statusCode}`);
        console.log(`  Body: ${body.substring(0, 800)}`);
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        res.end(body);
      });
    });
    proxyReq.on("error", (e) => console.error("  Proxy error:", e.message));
    req.pipe(proxyReq);
  } else {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
window._AMapSecurityConfig = { serviceHost: "/_AMapService" };
var s = document.createElement("script");
s.src = "https://webapi.amap.com/maps?v=2.0&key=d1f15ad3fdf0c704434eaf23c7c18698&plugin=AMap.PlaceSearch";
s.onload = function() {
  var ps = new AMap.PlaceSearch({city:"无锡",pageSize:5});
  ps.search("灵山胜境", function(status, res) {
    document.body.innerHTML += "<pre>Status: " + status + "\\nPOI count: " + (res&&res.pois?res.pois.length:0) + "\\n" + JSON.stringify(res,null,2).substring(0,3000) + "</pre>";
  });
};
document.head.appendChild(s);
</script></body></html>`);
  }
});

server.listen(PORT, async () => {
  console.log("Server at", PORT);
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("BROWSER:", msg.text().substring(0, 200)));
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(15000);
  const text = await page.evaluate(() => document.body.innerText);
  console.log("\n=== PAGE CONTENT ===");
  console.log(text.substring(0, 5000));
  await browser.close();
  server.close();
  process.exit(0);
});
