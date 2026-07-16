import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = "file:///" + path.resolve(__dirname, "amapSearch.html").replace(/\\/g, "/");

console.log("Loading:", htmlPath);

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage();

page.on("console", (msg) => console.log("PAGE:", msg.text()));

await page.goto(htmlPath, { waitUntil: "networkidle", timeout: 60000 });

// Wait for search results
await page.waitForTimeout(20000);

// Extract the final results
const jsonText = await page.evaluate(() => {
  const pre = document.querySelector("pre");
  return pre ? pre.textContent : null;
});

if (jsonText) {
  console.log("\n=== COORDINATES ===");
  console.log(jsonText);
} else {
  // Fallback: extract from result divs
  const resultsText = await page.evaluate(() => {
    return document.getElementById("results")?.innerText || "NO RESULTS";
  });
  console.log("Results:", resultsText);
}

await browser.close();
