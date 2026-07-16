import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import lingshanSpots from "../../data/lingshanSpots";
import lingshanRoutes from "../../data/lingshanRoutes";
import { getSpotIcon } from "./mapIcons";

// Spot data is in GCJ-02 (Amap coordinate system).
// Amap tiles are also GCJ-02, so Leaflet treats GCJ-02 as WGS-84,
// and the markers directly align with tile imagery — no conversion needed.

interface Props {
  activeRouteId: string | null;
  highlightedSpotId: string | null;
  onSpotClick: (spotId: string, spotName: string) => void;
  onRouteSelect: (routeId: string) => void;
}

function MapBoundsUpdater({
  activeRouteId,
}: {
  activeRouteId: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!activeRouteId) return;
    const route = lingshanRoutes.find((r) => r.id === activeRouteId);
    if (!route) return;
    const coords = route.spotIds
      .map((id) => lingshanSpots.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => [s!.lat, s!.lng] as [number, number]);
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [activeRouteId, map]);
  return null;
}

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 200);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    const t3 = setTimeout(() => map.invalidateSize(), 1500);
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);
  return null;
}

function FlyToMarker({ spotId }: { spotId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!spotId) return;
    const spot = lingshanSpots.find((s) => s.id === spotId);
    if (spot) {
      map.flyTo([spot.lat, spot.lng], 17, { duration: 1 });
    }
  }, [spotId, map]);
  return null;
}

export default function LingshanMap({
  activeRouteId,
  highlightedSpotId,
  onSpotClick,
  onRouteSelect,
}: Props) {
  const route = activeRouteId
    ? lingshanRoutes.find((r) => r.id === activeRouteId)
    : null;

  const routeLine = useMemo(() => {
    if (!route) return [];
    return route.spotIds
      .map((id) => lingshanSpots.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => [s!.lat, s!.lng] as [number, number]);
  }, [route]);

  const routeSpots = useMemo(
    () => new Set(route?.spotIds ?? []),
    [route]
  );

  // Center on 九龙灌浴 (central plaza area) in GCJ-02 — Amap verified
  const center: [number, number] = [31.424601, 120.099984];

  return (
    <div className="map-panel">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: 12 }}
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
          url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={["1", "2", "3", "4"]}
        />

        {lingshanSpots.map((spot) => {
          const onRoute = routeSpots.has(spot.id);
          const isHighlighted = highlightedSpotId === spot.id;
          const icon = getSpotIcon(
            spot.category,
            isHighlighted || onRoute
          );

          return (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={icon}
            >
              <Popup autoPan={false}>
                <div className="map-popup-name">{spot.name}</div>
                <div className="map-popup-desc">{spot.description}</div>
                <button
                  className="map-popup-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpotClick(spot.id, spot.name);
                  }}
                >
                  了解更多
                </button>
              </Popup>
            </Marker>
          );
        })}

        {routeLine.length > 1 && (
          <Polyline
            positions={routeLine}
            color="#f59e0b"
            weight={3}
            opacity={0.8}
            dashArray="8 4"
          />
        )}

        {/* Route legend */}
        <div className="map-route-legend">
          <h4>游览路线</h4>
          {lingshanRoutes.map((r) => (
            <div
              key={r.id}
              className={`map-route-legend-item${r.id === activeRouteId ? " active" : ""}`}
              onClick={() => onRouteSelect(r.id)}
            >
              {r.name} ({r.duration})
            </div>
          ))}
        </div>

        <MapResizeHandler />
        <MapBoundsUpdater activeRouteId={activeRouteId} />
        <FlyToMarker spotId={highlightedSpotId} />
      </MapContainer>
    </div>
  );
}
