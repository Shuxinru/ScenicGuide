import apiClient from "./client";
import type { SpotCoord } from "../types/map";

export interface SpotFromAPI {
  id: number;
  spot_code: string;
  spot_name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  detailed_intro: string;
  highlights: string;
  open_info: string;
}

/** Fetch scenic spots from backend with GCJ-02 coordinates */
export async function fetchSpots(): Promise<SpotCoord[]> {
  const { data } = await apiClient.get<{ spots: SpotFromAPI[] }>("/spots");
  return data.spots
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.spot_name,
      name: s.spot_name,
      lat: s.latitude!,
      lng: s.longitude!,
      category: inferCategory(s.spot_name, s.location),
      description: s.detailed_intro?.substring(0, 60) || s.location || "",
    }));
}

function inferCategory(name: string, location: string): SpotCoord["category"] {
  if (name.includes("寺") || name.includes("宫") || name.includes("坛城")) return "temple";
  if (name.includes("佛") || name.includes("弥勒")) return "statue";
  if (name.includes("桥") || name.includes("大道") || name.includes("路")) return "pathway";
  if (name.includes("灌浴") || name.includes("塔") || name.includes("湖")) return "landscape";
  return "cultural";
}
