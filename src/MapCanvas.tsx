import { useEffect, useRef } from "react";
import Map from "ol/Map.js";
import TileLayer from "ol/layer/Tile.js";
import type TileSource from "ol/source/Tile.js";
import type VectorLayer from "ol/layer/Vector.js";
import type VectorSource from "ol/source/Vector.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { defaults as defaultInteractions } from "ol/interaction/defaults.js";
import { unByKey } from "ol/Observable.js";
import type { EventsKey } from "ol/events.js";
import { createTileGridOverlay, updateTileGridOverlay } from "./map/grid-overlay";
import { createRasterSource, syntheticTestRaster } from "./map/raster-source";
import type { RasterSourceAdapter } from "./map/raster-source";
import { TEST_MIN_ZOOM, TEST_MAX_ZOOM } from "./map/tile-grid";
import { createRasterView } from "./map/raster-view";
import type { MapStatus } from "./types";

interface MapCanvasProps {
  onMapReady: (map: Map | null) => void;
  rasterSource: RasterSourceAdapter;
  rasterVisible: boolean;
  opacity: number;
  onCoordinate: (coordinate: [number, number] | null) => void;
  onStatus: (status: MapStatus) => void;
  onZoom: (zoom: number) => void;
}

export default function MapCanvas({
  onMapReady,
  rasterSource = syntheticTestRaster,
  rasterVisible,
  opacity,
  onCoordinate,
  onStatus,
  onZoom,
}: MapCanvasProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const rasterRef = useRef<TileLayer<TileSource> | null>(null);
  const gridRef = useRef<VectorLayer<VectorSource> | null>(null);
  const adapterRef = useRef(rasterSource);
  const lastAdapterRef = useRef(rasterSource);
  adapterRef.current = rasterSource;
  const callbacksRef = useRef({ onCoordinate, onMapReady, onStatus, onZoom });
  callbacksRef.current = { onCoordinate, onMapReady, onStatus, onZoom };

  useEffect(() => {
    if (!targetRef.current) return;

    const raster = new TileLayer<TileSource>({
      source: createRasterSource(rasterSource),
      opacity,
      visible: rasterVisible,
      preload: 0,
    });
    const grid = createTileGridOverlay(rasterSource);
    const map = new Map({
      target: targetRef.current,
      layers: [raster, grid],
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }),
      interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false }),
      view: createRasterView(rasterSource),
    });
    mapRef.current = map;
    rasterRef.current = raster;
    gridRef.current = grid;
    callbacksRef.current.onMapReady(map);

    let activeTiles = 0;
    let tileFailed = false;
    let sourceKeys: EventsKey[] = [];
    const attachTileListeners = () => {
      unByKey(sourceKeys);
      sourceKeys = [];
      const source = raster.getSource();
      if (source) {
        sourceKeys.push(
          source.on("tileloadstart", () => {
            activeTiles += 1;
            tileFailed = false;
            callbacksRef.current.onStatus("loading");
          }),
          source.on("tileloadend", () => {
            activeTiles = Math.max(0, activeTiles - 1);
            if (activeTiles === 0 && !tileFailed) callbacksRef.current.onStatus("ready");
          }),
          source.on("tileloaderror", () => {
            activeTiles = Math.max(0, activeTiles - 1);
            tileFailed = true;
            callbacksRef.current.onStatus("error");
          }),
        );
      }
    };
    attachTileListeners();
    const keys: EventsKey[] = [
      raster.on("change:source", () => {
        activeTiles = 0;
        tileFailed = false;
        attachTileListeners();
      }),
    ];

    keys.push(
      map.on("pointermove", (event) => {
        if (event.dragging) return;
        callbacksRef.current.onCoordinate(map.getCoordinateFromPixel(event.pixel) as [number, number]);
      }),
      map.on("movestart", () => callbacksRef.current.onStatus("loading")),
      map.on("moveend", () => {
        const zoom = Math.round(map.getView().getZoom() ?? 0);
        callbacksRef.current.onZoom(zoom);
        updateTileGridOverlay(grid, zoom, adapterRef.current);
        if (activeTiles === 0 && !tileFailed) callbacksRef.current.onStatus("ready");
      }),
    );

    map.once("rendercomplete", () => {
      if (activeTiles === 0 && !tileFailed) callbacksRef.current.onStatus("ready");
    });
    return () => {
      unByKey(keys);
      unByKey(sourceKeys);
      map.setTarget(undefined);
      map.dispose();
      callbacksRef.current.onMapReady(null);
      mapRef.current = null;
      rasterRef.current = null;
      gridRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (lastAdapterRef.current === rasterSource) return;
    lastAdapterRef.current = rasterSource;
    const map = mapRef.current;
    const raster = rasterRef.current;
    const grid = gridRef.current;
    if (!map || !raster || !grid) return;

    raster.setSource(createRasterSource(rasterSource));
    map.setView(createRasterView(rasterSource));
    updateTileGridOverlay(grid, 0, rasterSource);
    map.getView().setZoom(rasterSource.id === "synthetic-test-only" ? 0 : 4);
    callbacksRef.current.onZoom(Math.round(map.getView().getZoom() ?? 0));
    callbacksRef.current.onStatus(rasterVisible ? "loading" : "ready");
  }, [rasterSource, rasterVisible]);

  useEffect(() => {
    rasterRef.current?.setOpacity(opacity);
  }, [opacity]);

  useEffect(() => {
    rasterRef.current?.setVisible(rasterVisible);
  }, [rasterVisible]);

  return (
    <div
      className="map-canvas"
      ref={targetRef}
      role="application"
      aria-label="Interactive Mars projected test map"
      onMouseLeave={() => onCoordinate(null)}
    />
  );
}

export function changeMapZoom(
  map: Map | null,
  delta: number,
  minZoom = TEST_MIN_ZOOM,
  maxZoom = TEST_MAX_ZOOM,
): void {
  if (!map) return;
  const view = map.getView();
  const zoom = view.getZoom() ?? 0;
  view.animate({ zoom: Math.max(minZoom, Math.min(maxZoom, zoom + delta)), duration: 180 });
}
