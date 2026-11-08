import Feature from "ol/Feature.js";
import LineString from "ol/geom/LineString.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import { Stroke, Style } from "ol/style.js";
import type { RasterSourceAdapter } from "./raster-source";

export function createTileGridOverlay(adapter: RasterSourceAdapter): VectorLayer<VectorSource> {
  const source = new VectorSource();
  const layer = new VectorLayer({
    source,
    style: new Style({
      stroke: new Stroke({
        color: "rgba(118, 227, 208, 0.32)",
        width: 1,
        lineDash: [4, 6],
      }),
    }),
  });

  updateTileGridOverlay(layer, 0, adapter);
  return layer;
}

export function updateTileGridOverlay(
  layer: VectorLayer<VectorSource>,
  zoom: number,
  adapter: RasterSourceAdapter,
): void {
  const source = layer.getSource();
  if (!source) return;
  const clampedZoom = Math.max(adapter.minZoom, Math.min(adapter.maxZoom, zoom));
  const span = adapter.tileGrid.getResolution(clampedZoom) * 256;
  const [minX, minY, maxX, maxY] = adapter.extent;
  const [originX, originY] = adapter.tileGrid.getOrigin(clampedZoom);
  const features: Feature<LineString>[] = [];
  const firstX = originX + Math.floor((minX - originX) / span) * span;
  const firstY = originY - Math.ceil((originY - maxY) / span) * span;
  for (let x = firstX; x <= maxX; x += span) {
    if (x >= minX) features.push(new Feature(new LineString([[x, minY], [x, maxY]])));
  }
  for (let y = firstY; y >= minY; y -= span) {
    if (y <= maxY) features.push(new Feature(new LineString([[minX, y], [maxX, y]])));
  }
  source.clear(true);
  source.addFeatures(features);
}
