import L from "leaflet";

const spotIcon = L.divIcon({
  className: "lingshan-marker",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#f97316"/>
    <circle cx="14" cy="13" r="6" fill="white"/>
    <text x="14" y="16" text-anchor="middle" fill="#f97316" font-size="10" font-weight="bold">📍</text>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -38],
});

const statueIcon = L.divIcon({
  className: "lingshan-marker statue",
  html: `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="#eab308"/>
    <circle cx="16" cy="15" r="7" fill="white"/>
    <text x="16" y="19" text-anchor="middle" font-size="13">🪷</text>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -42],
});

const templeIcon = L.divIcon({
  className: "lingshan-marker temple",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#ef4444"/>
    <circle cx="14" cy="13" r="6" fill="white"/>
    <text x="14" y="17" text-anchor="middle" font-size="12">🏛</text>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -38],
});

const highlightedIcon = L.divIcon({
  className: "lingshan-marker highlighted",
  html: `<svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#1677ff"/>
    <circle cx="18" cy="17" r="8" fill="white"/>
    <circle cx="18" cy="17" r="4" fill="#1677ff"/>
  </svg>`,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -46],
});

export function getSpotIcon(
  category: string,
  isHighlighted: boolean
): L.DivIcon {
  if (isHighlighted) return highlightedIcon;
  switch (category) {
    case "statue":
      return statueIcon;
    case "temple":
      return templeIcon;
    default:
      return spotIcon;
  }
}
