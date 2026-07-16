export interface SpotCoord {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: "temple" | "landscape" | "statue" | "cultural" | "pathway";
  description: string;
}

export interface RouteData {
  id: string;
  name: string;
  duration: string;
  spotIds: string[];
  description: string;
}
