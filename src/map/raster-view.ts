import View from "ol/View.js";
import { getMarsProjectedProjection } from "./projection";
import type { RasterSourceAdapter } from "./raster-source";

export function createRasterView(adapter: RasterSourceAdapter): View {
  const [minX, minY, maxX, maxY] = adapter.extent;
  return new View({
    projection: getMarsProjectedProjection(),
    center: [(minX + maxX) / 2, (minY + maxY) / 2],
    extent: adapter.extent,
    resolutions: adapter.tileGrid.getResolutions(),
    zoom: adapter.id === "synthetic-test-only" ? 0 : 4,
    minZoom: adapter.minZoom,
    maxZoom: adapter.maxZoom,
    constrainOnlyCenter: true,
    showFullExtent: true,
  });
}
