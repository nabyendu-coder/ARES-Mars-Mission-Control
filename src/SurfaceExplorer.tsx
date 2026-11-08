import { useCallback, useMemo, useRef, useState } from "react";
import Map from "ol/Map.js";
import MapCanvas, { changeMapZoom } from "./MapCanvas";
import {
  MARS_PROJECTED_CRS,
  marsProjectedToGeographic,
} from "./map/projection";
import { getRasterAdapter } from "./map/raster-source";
import type { MapStatus, RasterSelection } from "./types";

function hemisphere(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(5)}° ${value < 0 ? negative : positive}`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(0)} km` : `${meters.toFixed(0)} m`;
}

export default function App() {
  const baseUrl = import.meta.env.BASE_URL;
  const realRasterLayersAvailable = import.meta.env.DEV;
  const mapRef = useRef<Map | null>(null);
  const [selection, setSelection] = useState<RasterSelection>("synthetic");
  const [opacity, setOpacity] = useState(88);
  const [coordinate, setCoordinate] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [zoom, setZoom] = useState(0);
  const rasterSource = getRasterAdapter(selection);
  const rasterVisible = selection !== "none";
  const selectedRasterVisible = selection !== "none";
  const activeExtent = rasterSource.extent;
  const projectedCoordinate = coordinate ?? [
    (activeExtent[0] + activeExtent[2]) / 2,
    (activeExtent[1] + activeExtent[3]) / 2,
  ];
  const marsCoordinate = useMemo(() => marsProjectedToGeographic(projectedCoordinate), [projectedCoordinate]);
  const extentWidth = (activeExtent[2] - activeExtent[0]) / (2 ** zoom);

  const onCoordinate = useCallback((next: [number, number] | null) => setCoordinate(next), []);
  const onMapReady = useCallback((map: Map | null) => { mapRef.current = map; }, []);
  const onStatus = useCallback((next: MapStatus) => setStatus(next), []);
  const onZoom = useCallback((next: number) => setZoom(next), []);
  const canZoomOut = zoom > rasterSource.minZoom;
  const canZoomIn = zoom < rasterSource.maxZoom;

  return (
    <main className="explorer">
      <header className="topbar">
        <a className="brand" href={baseUrl} aria-label="ARES Surface Explorer">
          <span className="brand-symbol">A</span>
          <span className="brand-wordmark">ARES <i>/</i> SURFACE EXPLORER</span>
        </a>
        <div className="environment-tag"><span className={`status-led ${status}`} />{statusLabel(status, selection)}</div>
        <div className="mission-tag">
          <nav className="view-switch" aria-label="View mode">
            <a className="view-switch-link" href={`${baseUrl}?view=mission`}>3D TERRAIN</a>
            <span className="view-switch-current" aria-current="page">2D EXPLORER</span>
          </nav>
          <span>RASTER SOURCE <strong>{selection === "none" ? "NONE" : "LOCAL"}</strong></span>
        </div>
      </header>

      <section className="map-stage" aria-label="Mars Surface Explorer">
        <MapCanvas
          onMapReady={onMapReady}
          rasterSource={rasterSource}
          rasterVisible={rasterVisible}
          opacity={opacity / 100}
          onCoordinate={onCoordinate}
          onStatus={onStatus}
          onZoom={onZoom}
        />
        <div className="map-wash" aria-hidden="true" />
        <div className="map-heading">
          <p className="eyebrow">MARS 2000 <span>/</span> {MARS_PROJECTED_CRS}</p>
          <h1>Read the <em>surface.</em></h1>
          <p>{selection === "synthetic"
            ? "Projection and renderer test region · no site selected"
            : selection === "none"
              ? "No raster selected · grid overlay remains active"
              : `${rasterSource.label} · prepared regional extent`}</p>
        </div>

        <section className="instrument-panel" aria-label="Map layers and controls">
          <div className="panel-heading">
            <span className="panel-index">01</span>
            <h2>MAP INSTRUMENTS</h2>
          </div>

          <label className="control-label" htmlFor="layer-select">VISIBLE LAYER</label>
          <select
            id="layer-select"
            className="layer-select"
            value={selection}
            onChange={(event) => setSelection(event.target.value as RasterSelection)}
          >
            <option value="synthetic">Synthetic test texture</option>
            <option value="optical" disabled={!realRasterLayersAvailable}>Optical Preview{realRasterLayersAvailable ? "" : " (local only)"}</option>
            <option value="hillshade" disabled={!realRasterLayersAvailable}>Hillshade{realRasterLayersAvailable ? "" : " (local only)"}</option>
            <option value="none">No raster / grid only</option>
          </select>
          {!realRasterLayersAvailable && (
            <p className="local-raster-note" role="note">
              Optical Preview and Hillshade need the local GDAL service and are not hosted here. This public view uses the synthetic test layer only.
            </p>
          )}

          <div className={`opacity-control ${rasterVisible ? "" : "disabled"}`}>
            <div className="control-line">
              <label className="control-label" htmlFor="opacity">LAYER OPACITY</label>
              <output htmlFor="opacity">{opacity}%</output>
            </div>
            <input
              id="opacity"
              type="range"
              min="0"
              max="100"
              step="1"
              value={opacity}
              disabled={!rasterVisible}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </div>

          <div className="zoom-controls" aria-label="Map zoom">
            <button type="button" onClick={() => changeMapZoom(mapRef.current, -1, rasterSource.minZoom, rasterSource.maxZoom)} disabled={!canZoomOut} aria-label="Zoom out">−</button>
            <span>LEVEL {zoom + 1} <small>/ {rasterSource.maxZoom + 1}</small></span>
            <button type="button" onClick={() => changeMapZoom(mapRef.current, 1, rasterSource.minZoom, rasterSource.maxZoom)} disabled={!canZoomIn} aria-label="Zoom in">+</button>
          </div>
          <p className="instrument-footnote">Interactive pan / scroll zoom · map grid follows tile resolution</p>
        </section>

        <aside className="legend-panel" aria-label="Layer legend">
          <div className="panel-heading">
            <span className="panel-index">02</span>
            <h2>LEGEND</h2>
          </div>
          {selectedRasterVisible ? (
            <>
              <div className="legend-entry">
                <span className="legend-ramp" aria-hidden="true" style={{ background: rasterSource.legend.ramp }} />
                <span>{rasterSource.label}</span>
              </div>
              <div className="legend-scale">
                <span>{rasterSource.legend.lowLabel}</span>
                <span>{rasterSource.legend.highLabel}</span>
              </div>
              <p className={rasterSource.legend.testOnly ? "legend-warning" : "legend-note"}>
                {rasterSource.legend.note}
              </p>
            </>
          ) : <p className="empty-legend">No raster layer selected. Grid only.</p>}
        </aside>

        <div className="coordinate-panel" aria-live="polite">
          <p className="coordinate-title">POINTER COORDINATES <span>·</span> MARS SPHERE</p>
          <p className="coordinate-primary">
            {hemisphere(marsCoordinate[1], "N", "S")} <span>/</span> {hemisphere(marsCoordinate[0], "E", "W")}
          </p>
          <p className="coordinate-secondary">
            {Math.round(projectedCoordinate[0]).toLocaleString()} m E <span>·</span> {Math.round(projectedCoordinate[1]).toLocaleString()} m N
          </p>
        </div>

        <div className="extent-indicator" aria-label={`Projected extent width ${formatDistance(extentWidth)}`}>
          <span>{formatDistance(extentWidth)}</span>
          <span className="extent-rule" aria-hidden="true" />
          <small>{selection === "synthetic" || selection === "none" ? "PROJECTED TEST SPAN" : "PROJECTED DATA SPAN"}</small>
        </div>

        {status === "loading" && (
          <div className="map-state loading-state" role="status">
            <span className="spinner" />
            <span>{selection === "synthetic" ? "Loading local test tiles" : `Loading ${rasterSource.label}`}</span>
          </div>
        )}
        {status === "error" && (
          <div className="map-state error-state" role="alert">
            <strong>{selection === "synthetic" ? "Test layer could not be loaded" : "Raster layer could not be loaded"}</strong>
            <span>Check that the local GDAL tile endpoint is available.</span>
          </div>
        )}

        <p className="map-stamp">
          ESRI:103885 <i>/</i> {formatDistance(activeExtent[2] - activeExtent[0])} × {formatDistance(activeExtent[3] - activeExtent[1])} {selection === "synthetic" || selection === "none" ? "TEST EXTENT / NOT GEOGRAPHICALLY REGISTERED" : "VERIFIED RASTER EXTENT / SOURCE CRS"}
        </p>
      </section>
    </main>
  );
}

function statusLabel(status: MapStatus, selection: string): string {
  if (status === "error") return "RENDER ERROR";
  if (status === "loading") return selection === "synthetic" ? "LOADING TEST LAYER" : "LOADING RASTER";
  return selection === "none" ? "GRID ONLY" : selection === "synthetic" ? "TEST LAYER READY" : "RASTER READY";
}
