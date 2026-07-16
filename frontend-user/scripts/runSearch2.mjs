import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = "file:///" + path.resolve(__dirname, "amapSearch2.html").replace(/\/g, "/");
console.log("Loading:", htmlPath);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage();
page.on("console", (msg) => {
  const t = msg.text();
  if (!t.includes("ERR_FILE") && !t.includes("Failed to load")) console.log(">", t.substring(0, 200));
});
await page.goto(htmlPath, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForFunction(() => document.getElementById("status").textContent === "DONE", { timeout: 60000 });
const text = await page.evaluate(() => document.querySelector("pre")?.textContent || "NO DATA");
console.log(text);
await browser.close();
