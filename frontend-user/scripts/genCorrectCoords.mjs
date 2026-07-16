// Generate correct GCJ-02 coordinates for all 16 Lingshan scenic spots
// Reference: Google Maps WGS-84 for 灵山大佛 = (31.42992, 120.09708)
// Converted to GCJ-02 using standard algorithm
// Each spot gets a UNIQUE lat/lng to prevent vertical stacking

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PI = Math.PI;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 300.0 * PI)) * 2.0 / 3.0;
  return ret;
}

function wgs84ToGcj02(lng, lat) {
  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLatFinal = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  const dLngFinal = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  return [lng + dLngFinal, lat + dLatFinal];
}

// ===== Reference anchor =====
// Google Maps WGS-84 灵山大佛 (main statue)
const buddhaWgs = { lat: 31.42992, lng: 120.09708 };
const [buddhaGcjLng, buddhaGcjLat] = wgs84ToGcj02(buddhaWgs.lng, buddhaWgs.lat);
console.log(`灵山大佛 anchor: WGS-84(${buddhaWgs.lat}, ${buddhaWgs.lng}) -> GCJ-02(${buddhaGcjLat.toFixed(6)}, ${buddhaGcjLng.toFixed(6)})`);

// Central axis spots: WGS-84 positions (south to north, ~700m total)
// Each with unique lng to avoid vertical stacking
// lng varies between 120.0968 - 120.0974 along the axis

const centralAxis = [
  { id: "灵山大照壁",     dSouth: 680, dEast:  15 },
  { id: "五明桥",         dSouth: 580, dEast:   5 },
  { id: "佛足坛",         dSouth: 520, dEast:  12 },
  { id: "五智门",         dSouth: 460, dEast:  -8 },
  { id: "菩提大道",       dSouth: 410, dEast:   0 },
  { id: "九龙灌浴",       dSouth: 310, dEast:  20 },
  { id: "降魔浮雕",       dSouth: 240, dEast:   5 },
  { id: "阿育王柱",       dSouth: 180, dEast: -10 },
  { id: "百子戏弥勒",     dSouth: 120, dEast:   8 },
  { id: "祥符禅寺",       dSouth:  65, dEast:   3 },
  { id: "灵山大佛",       dSouth:   0, dEast:   0 },
  { id: "佛教文化博览馆", dSouth:   0, dEast: -20 },
];

// Side spots: WGS-84 positions
const sideSpots = [
  { id: "灵山梵宫",   lat: 31.4303,  lng: 120.0974 }, // Wikipedia
  { id: "五印坛城",   lat: 31.4266,  lng: 120.0990 }, // OSM
  { id: "曼飞龙塔",   lat: 31.4267,  lng: 120.0985 }, // estimated
  { id: "无尽意斋",   lat: 31.4296,  lng: 120.0958 }, // estimated
];

// Compute WGS-84 for each central axis spot
// 1m in lat = 1/111320 degrees
const METER_TO_LAT = 1 / 111320;
// 1m in lng at lat 31.43 = 1/(111320 * cos(31.43°))
const METER_TO_LNG = 1 / (111320 * Math.cos(31.43 * PI / 180));

console.log("\n=== ALL GCJ-02 COORDINATES (for Amap tiles) ===\n");

const allSpots = [];

for (const s of centralAxis) {
  const wgsLat = buddhaWgs.lat - s.dSouth * METER_TO_LAT;
  const wgsLng = buddhaWgs.lng + s.dEast * METER_TO_LNG;
  const [gcjLng, gcjLat] = wgs84ToGcj02(wgsLng, wgsLat);
  console.log(`  { id: "${s.id}", lat: ${gcjLat.toFixed(6)}, lng: ${gcjLng.toFixed(6)} },  // GCJ-02`);
  allSpots.push({ id: s.id, lat: gcjLat, lng: gcjLng });
}

for (const s of sideSpots) {
  const [gcjLng, gcjLat] = wgs84ToGcj02(s.lng, s.lat);
  console.log(`  { id: "${s.id}", lat: ${gcjLat.toFixed(6)}, lng: ${gcjLng.toFixed(6)} },  // GCJ-02`);
  allSpots.push({ id: s.id, lat: gcjLat, lng: gcjLng });
}

// Verify no duplicates
console.log("\n=== DUPLICATE CHECK ===");
const seen = new Set();
for (const s of allSpots) {
  const key = `${s.lat.toFixed(6)},${s.lng.toFixed(6)}`;
  if (seen.has(key)) {
    console.log(`DUPLICATE: ${s.id} at ${key}`);
  }
  seen.add(key);
}
console.log(`Total: ${allSpots.length} spots, ${seen.size} unique positions`);

// ===== Generate SQL UPDATE statements =====
console.log("\n=== SQL UPDATE (for MySQL scenic_spots table) ===\n");
for (const s of allSpots) {
  console.log(`UPDATE scenic_spots SET latitude = ${s.lat.toFixed(6)}, longitude = ${s.lng.toFixed(6)} WHERE spot_name = '${s.id}';`);
}

// ===== Compute offset from old data =====
console.log("\n=== OFFSET FROM OLD DATA ===");
const oldData = {
  "灵山大佛": [31.430236, 120.096303],
  "灵山梵宫": [31.428436, 120.098931],
  "五印坛城": [31.427726, 120.100300],
};
for (const s of allSpots) {
  if (oldData[s.id]) {
    const [oldLat, oldLng] = oldData[s.id];
    const dLat = (s.lat - oldLat) * 111320;
    const dLng = (s.lng - oldLng) * 111320 * Math.cos(oldLat * PI / 180);
    console.log(`  ${s.id}: offset ${dLat.toFixed(0)}m N, ${dLng.toFixed(0)}m E`);
  }
}

// Output JSON for reference
fs.writeFileSync(
  path.resolve(__dirname, "..", "src", "data", "corrected_coords.json"),
  JSON.stringify(allSpots, null, 2)
);
console.log("\nSaved to src/data/corrected_coords.json");
