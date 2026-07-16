import { create } from "zustand";

interface MapState {
  mapVisible: boolean;
  selectedSpotId: string | null;
  selectedRouteId: string | null;
  toggleMap: () => void;
  selectSpot: (spotId: string | null) => void;
  selectRoute: (routeId: string | null) => void;
}

const useMapStore = create<MapState>((set) => ({
  mapVisible: false,
  selectedSpotId: null,
  selectedRouteId: null,
  toggleMap: () => set((s) => ({ mapVisible: !s.mapVisible })),
  selectSpot: (spotId) => set({ selectedSpotId: spotId }),
  selectRoute: (routeId) =>
    set({ selectedRouteId: routeId, selectedSpotId: null }),
}));

export default useMapStore;
