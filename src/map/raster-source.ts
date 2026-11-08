import type TileSource from "ol/source/Tile.js";
import type TileGrid from "ol/tilegrid/TileGrid.js";
import type { Extent } from "ol/extent.js";
import { createSyntheticRasterSource, TEST_RASTER_LABEL } from "./synthetic-raster";
import { getMarsProjectedProjection } from "./projection";
import {
  REAL_DATA_EXTENT,
  REAL_DATA_MAX_ZOOM,
  REAL_DATA_MIN_ZOOM,
  realDataTileGrid,
  TEST_EXTENT,
  TEST_MAX_ZOOM,
  TEST_MIN_ZOOM,
  testTileGrid,
} from "./tile-grid";
import XYZ from "ol/source/XYZ.js";

export interface RasterLegend {
  readonly ramp: string;
  readonly lowLabel: string;
  readonly highLabel: string;
  readonly note: string;
  readonly testOnly?: boolean;
}

export interface RasterSourceAdapter {
  readonly id: string;
  readonly label: string;
  readonly extent: Extent;
  readonly tileGrid: TileGrid;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly legend: RasterLegend;
  createSource(): TileSource;
}

export const syntheticTestRaster: RasterSourceAdapter = Object.freeze({
  id: "synthetic-test-only",
  label: TEST_RASTER_LABEL,
  extent: TEST_EXTENT,
  tileGrid: testTileGrid,
  minZoom: TEST_MIN_ZOOM,
  maxZoom: TEST_MAX_ZOOM,
  legend: {
    ramp: "linear-gradient(135deg, #a18a62, #766d52 48%, #41483d)",
    lowLabel: "DARK",
    highLabel: "LIGHT",
    note: "TEST ONLY / NO SCIENTIFIC VALUES",
    testOnly: true,
  },
  createSource: createSyntheticRasterSource,
});

function createGdalRasterSource(dataset: "optical" | "hillshade"): XYZ {
  return new XYZ({
    projection: getMarsProjectedProjection(),
    tileGrid: realDataTileGrid,
    minZoom: REAL_DATA_MIN_ZOOM,
    maxZoom: REAL_DATA_MAX_ZOOM,
    wrapX: false,
    transition: 0,
    url: `/gdal/tiles/${dataset}/{z}/{x}/{y}.png`,
  });
}

export const opticalPreviewRaster: RasterSourceAdapter = Object.freeze({
  id: "optical-preview",
  label: "Optical Preview",
  extent: REAL_DATA_EXTENT,
  tileGrid: realDataTileGrid,
  minZoom: REAL_DATA_MIN_ZOOM,
  maxZoom: REAL_DATA_MAX_ZOOM,
  legend: {
    ramp: "linear-gradient(90deg, #111, #f1f1f1)",
    lowLabel: "LOW PIXEL VALUE",
    highLabel: "HIGH PIXEL VALUE",
    note: "Grayscale display / NoData transparent",
  },
  createSource: () => createGdalRasterSource("optical"),
});

export const hillshadeRaster: RasterSourceAdapter = Object.freeze({
  id: "hillshade",
  label: "Hillshade",
  extent: REAL_DATA_EXTENT,
  tileGrid: realDataTileGrid,
  minZoom: REAL_DATA_MIN_ZOOM,
  maxZoom: REAL_DATA_MAX_ZOOM,
  legend: {
    ramp: "linear-gradient(90deg, #111, #f1f1f1)",
    lowLabel: "DARK",
    highLabel: "LIGHT",
    note: "Grayscale hillshade / NoData transparent",
  },
  createSource: () => createGdalRasterSource("hillshade"),
});

export type RasterSelection = "synthetic" | "optical" | "hillshade" | "none";

export function getRasterAdapter(selection: RasterSelection): RasterSourceAdapter {
  if (selection === "optical") return opticalPreviewRaster;
  if (selection === "hillshade") return hillshadeRaster;
  return syntheticTestRaster;
}

export function createRasterSource(adapter: RasterSourceAdapter = syntheticTestRaster): TileSource {
  return adapter.createSource();
}
