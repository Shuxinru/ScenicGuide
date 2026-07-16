// Compute GCJ-02 coordinates from WGS-84 reference points
// Uses the same algorithm as coordTransform.ts

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

// reference: Google Maps 灵山大佛 WGS-84 = (31.42992, 120.09708)
const buddhaWgs = { lat: 31.42992, lng: 120.09708 };
const [buddhaGcjLng, buddhaGcjLat] = wgs84ToGcj02(buddhaWgs.lng, buddhaWgs.lat);
console.log(`灵山大佛 WGS-84: (${buddhaWgs.lat}, ${buddhaWgs.lng})`);
console.log(`灵山大佛 GCJ-02: (${buddhaGcjLat.toFixed(6)}, ${buddhaGcjLng.toFixed(6)})`);

// reference: Wikipedia 灵山梵宫 WGS-84 = (31.4303, 120.0974)
const fangongWgs = { lat: 31.4303, lng: 120.0974 };
const [fangongGcjLng, fangongGcjLat] = wgs84ToGcj02(fangongWgs.lng, fangongWgs.lat);
console.log(`灵山梵宫 WGS-84: (${fangongWgs.lat}, ${fangongWgs.lng})`);
console.log(`灵山梵宫 GCJ-02: (${fangongGcjLat.toFixed(6)}, ${fangongGcjLng.toFixed(6)})`);

// South entrance (大照壁) is ~600m south of 大佛 along the central axis
// 1m lat = 1/111320 degree
const southOffsetLat = -600 / 111320;
const entranceWgs = { lat: buddhaWgs.lat + southOffsetLat, lng: buddhaWgs.lng };
const [entranceGcjLng, entranceGcjLat] = wgs84ToGcj02(entranceWgs.lng, entranceWgs.lat);
console.log(`灵山大照壁 WGS-84 est: (${entranceWgs.lat.toFixed(6)}, ${entranceWgs.lng.toFixed(6)})`);
console.log(`灵山大照壁 GCJ-02 est: (${entranceGcjLat.toFixed(6)}, ${entranceGcjLng.toFixed(6)})`);

// Central axis WGS-84 points (south to north along ~120.097)
const spots = [
  { id: "灵山大照壁",      distFromSouth: 0,    lngOffset: 0 },
  { id: "五明桥",          distFromSouth: 100,  lngOffset: 0 },
  { id: "佛足坛",          distFromSouth: 160,  lngOffset: 0 },
  { id: "五智门",          distFromSouth: 220,  lngOffset: 0 },
  { id: "菩提大道",        distFromSouth: 270,  lngOffset: 0 },
  { id: "九龙灌浴",        distFromSouth: 370,  lngOffset: 0.00010 }, // plaza, slightly east
  { id: "降魔浮雕",        distFromSouth: 450,  lngOffset: 0 },
  { id: "阿育王柱",        distFromSouth: 510,  lngOffset: 0 },
  { id: "百子戏弥勒",      distFromSouth: 570,  lngOffset: -0.00005 }, // slightly west
  { id: "祥符禅寺",        distFromSouth: 630,  lngOffset: 0 },
  { id: "灵山大佛",        distFromSouth: 690,  lngOffset: 0 },
  { id: "佛教文化博览馆",  distFromSouth: 690,  lngOffset: -0.00020 }, // under Buddha, west
];

// East side spots (WGS-84)
const eastSpots = [
  { id: "灵山梵宫",   lat: 31.4303,  lng: 120.0974 }, // Wikipedia
  { id: "五印坛城",   lat: 31.4266,  lng: 120.0990 }, // OSM/estimated
  { id: "曼飞龙塔",   lat: 31.4267,  lng: 120.0985 }, // estimated
];

// West side spots (WGS-84)
const westSpots = [
  { id: "无尽意斋",   lat: 31.4300,  lng: 120.0955 }, // estimated
];

console.log("\n=== ALL GCJ-02 COORDINATES ===");

// Central axis spots
for (const s of spots) {
  const wgsLat = entranceWgs.lat + (s.distFromSouth / 111320);
  const wgsLng = entranceWgs.lng + (s.lngOffset || 0);
  const [gcjLng, gcjLat] = wgs84ToGcj02(wgsLng, wgsLat);
  console.log(`  { id: "${s.id}", lat: ${gcjLat.toFixed(6)}, lng: ${gcjLng.toFixed(6)} }`);
}

// East and west spots
for (const s of [...eastSpots, ...westSpots]) {
  const [gcjLng, gcjLat] = wgs84ToGcj02(s.lng, s.lat);
  console.log(`  { id: "${s.id}", lat: ${gcjLat.toFixed(6)}, lng: ${gcjLng.toFixed(6)} }`);
}

// Verify offset
console.log("\n=== OFFSET CHECK ===");
console.log(`GCJ offset at 灵山大佛: dLat=${(buddhaGcjLat-buddhaWgs.lat).toFixed(6)}, dLng=${(buddhaGcjLng-buddhaWgs.lng).toFixed(6)}`);
