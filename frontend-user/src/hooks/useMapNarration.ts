import { useCallback } from "react";
import useMapStore from "../store/mapStore";

export default function useMapNarration(onSend: (text: string) => void) {
  const selectSpot = useMapStore((s) => s.selectSpot);
  const selectRoute = useMapStore((s) => s.selectRoute);

  const handleSpotClick = useCallback(
    (spotId: string, spotName: string) => {
      selectSpot(spotId);
      onSend(
        `请介绍一下【${spotName}】的情况，包括历史背景、文化内涵和游览亮点。`
      );
    },
    [onSend, selectSpot]
  );

  const handleRouteSelect = useCallback(
    (routeId: string) => {
      selectRoute(routeId);
      onSend(
        `请介绍一下【${routeId}】游览路线，全程需要多长时间，有哪些必看的景点？`
      );
    },
    [onSend, selectRoute]
  );

  return { handleSpotClick, handleRouteSelect };
}
