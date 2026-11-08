import { describe, expect, it } from "vitest";
import { get as getProjection } from "ol/proj.js";
import TileLayer from "ol/layer/Tile.js";
import XYZ from "ol/source/XYZ.js";
import {
  MARS_GEOGRAPHIC_CRS,
  MARS_PROJECTED_CRS,
  marsGeographicToProjected,
  marsProjectedToGeographic,
} from "../src/map/projection";
import {
  TEST_BASE_RESOLUTION,
  TEST_EXTENT,
  TEST_MAX_ZOOM,
  TEST_TILE_SIZE,
  getTestTileExtent,
  testTileGrid,
} from "../src/map/tile-grid";
import {
  createTestTileSvg,
  TEST_RASTER_LABEL,
} from "../src/map/synthetic-raster";
import {
  createRasterSource,
  getRasterAdapter,
  hillshadeRaster,
  opticalPreviewRaster,
  syntheticTestRaster,
} from "../src/map/raster-source";
import {
  REAL_DATA_BASE_RESOLUTION,
  REAL_DATA_EXTENT,
  REAL_DATA_MAX_ZOOM,
  REAL_DATA_TILE_SIZE,
  realDataTileGrid,
} from "../src/map/tile-grid";
import { createRasterView } from "../src/map/raster-view";

describe("Mars CRS registration", () => {
  it("registers ESRI:103885 as the equidistant cylindrical Mars 2000 sphere", () => {
    const projection = getProjection(MARS_PROJECTED_CRS);
    expect(projection).toBeDefined();
    expect(projection?.getUnits()).toBe("m");
    expect(projection?.getExtent()?.[2]).toBeCloseTo(Math.PI * 3_396_190, 6);
    expect(getProjection(MARS_GEOGRAPHIC_CRS)).toBeDefined();
  });

  it("projects one equatorial degree using the Mars sphere radius", () => {
    const [x, y] = marsGeographicToProjected([1, 0]);
    expect(x).toBeCloseTo(59_274.70, 2);
    expect(y).toBeCloseTo(0, 8);
  });

  it("round-trips representative Mars longitude and latitude coordinates", () => {
    for (const coordinate of [[0, 0], [-73.4, 12.25], [120, -80]]) {
      const projected = marsGeographicToProjected(coordinate);
      const roundTrip = marsProjectedToGeographic(projected);
      expect(roundTrip[0]).toBeCloseTo(coordinate[0], 9);
      expect(roundTrip[1]).toBeCloseTo(coordinate[1], 9);
    }
  });
});

describe("test extent and tile grid", () => {
  it("uses a 20 km square extent and a 256 pixel, four-tile base zoom", () => {
    expect(TEST_EXTENT).toEqual([-10_000, -10_000, 10_000, 10_000]);
    expect(TEST_TILE_SIZE).toBe(256);
    expect(TEST_BASE_RESOLUTION * TEST_TILE_SIZE).toBe(10_000);
    expect(testTileGrid.getFullTileRange(0)).toMatchObject({ minX: 0, maxX: 1, minY: 0, maxY: 1 });
    expect(testTileGrid.getFullTileRange(TEST_MAX_ZOOM)).toMatchObject({ minX: 0, maxX: 31, minY: 0, maxY: 31 });
  });

  it("places neighboring tile bounds exactly edge-to-edge", () => {
    const upperLeft = getTestTileExtent([0, 0, 0]);
    const upperRight = getTestTileExtent([0, 1, 0]);
    const lowerLeft = getTestTileExtent([0, 0, 1]);
    expect(upperLeft[2]).toBe(upperRight[0]);
    expect(upperLeft[1]).toBe(lowerLeft[3]);
    expect(upperLeft).toEqual([-10_000, 0, 0, 10_000]);
  });

  it("produces test-only tile imagery at each requested tile extent", () => {
    const svg = createTestTileSvg([0, 1, 0]);
    expect(svg).toContain(TEST_RASTER_LABEL);
    expect(svg).toContain('width="256" height="256"');
    expect(svg).toContain('viewBox="0 -10000 10000 10000"');
    expect(svg).not.toMatch(/elevation|meters? above|NASA|DTM/i);
  });

  it("provides an OpenLayers XYZ source with test tiles for the custom CRS", () => {
    const source = createRasterSource(syntheticTestRaster);
    const projection = getProjection(MARS_PROJECTED_CRS)!;
    expect(source).toBeInstanceOf(XYZ);
    if (!(source instanceof XYZ)) throw new Error("Synthetic adapter must create an XYZ source.");
    const url = source.getTileUrlFunction()([0, 0, 0], 1, projection);

    expect(source.getProjection()?.getCode()).toBe(MARS_PROJECTED_CRS);
    expect(url).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
    expect(decodeURIComponent(url!.split(",")[1])).toContain(TEST_RASTER_LABEL);
  });
});

describe("real raster adapters", () => {
  it("preserves the shared real-data extent and endpoint tile matrix", () => {
    expect(REAL_DATA_EXTENT).toEqual([4_577_464, 1_092_275, 4_592_296, 1_097_680]);
    expect(realDataTileGrid.getTileSize(0)).toBe(REAL_DATA_TILE_SIZE);
    expect(realDataTileGrid.getResolution(0)).toBe(REAL_DATA_BASE_RESOLUTION);
    expect(realDataTileGrid.getResolution(REAL_DATA_MAX_ZOOM)).toBe(1);
    expect(realDataTileGrid.getFullTileRange(6)).toMatchObject({
      minX: 0,
      maxX: 28,
      minY: 0,
      maxY: 10,
    });
  });

  it("selects both real rasters while retaining synthetic and no-raster choices", () => {
    expect(getRasterAdapter("synthetic")).toBe(syntheticTestRaster);
    expect(getRasterAdapter("optical")).toBe(opticalPreviewRaster);
    expect(getRasterAdapter("hillshade")).toBe(hillshadeRaster);
    expect(getRasterAdapter("none")).toBe(syntheticTestRaster);
  });

  it.each([
    {
      adapter: opticalPreviewRaster,
      coordinate: [6, 1, 0] as [number, number, number],
      url: "/gdal/tiles/optical/6/1/0.png",
    },
    {
      adapter: hillshadeRaster,
      coordinate: [7, 2, 3] as [number, number, number],
      url: "/gdal/tiles/hillshade/7/2/3.png",
    },
  ])("creates the $adapter.id XYZ source in the registered Mars CRS", ({ adapter, coordinate, url }) => {
    const source = createRasterSource(adapter);
    const projection = getProjection(MARS_PROJECTED_CRS)!;
    expect(source).toBeInstanceOf(XYZ);
    if (!(source instanceof XYZ)) throw new Error("Real raster adapter must create an XYZ source.");
    expect(source.getProjection()?.getCode()).toBe(MARS_PROJECTED_CRS);
    expect(source.getTileGrid()).toBe(realDataTileGrid);
    expect(source.getTileUrlFunction()(coordinate, 1, projection)).toBe(url);
    expect(adapter.extent).toEqual(REAL_DATA_EXTENT);
    expect(adapter.legend.note).toContain("NoData transparent");
  });

  it("configures grayscale legends without assigning scientific value labels", () => {
    for (const adapter of [opticalPreviewRaster, hillshadeRaster]) {
      expect(adapter.legend.ramp).toContain("#111");
      expect(adapter.legend.ramp).toContain("#f1f1f1");
      expect(adapter.legend.lowLabel).not.toMatch(/elevation|meters? above/i);
      expect(adapter.legend.note).toContain("NoData transparent");
      expect(adapter.legend.testOnly).toBeUndefined();
    }
  });

  it("keeps the map-layer object while switching source, opacity, and visibility", () => {
    const layer = new TileLayer({
      source: createRasterSource(syntheticTestRaster),
      opacity: 0.88,
      visible: true,
    });
    const originalLayer = layer;
    layer.setSource(createRasterSource(opticalPreviewRaster));
    layer.setOpacity(0.42);
    layer.setVisible(false);

    expect(layer).toBe(originalLayer);
    expect(layer.getSource()).toBeInstanceOf(XYZ);
    expect(layer.getOpacity()).toBe(0.42);
    expect(layer.getVisible()).toBe(false);
  });

  it("builds a real-data map view without changing the registered CRS", () => {
    const view = createRasterView(opticalPreviewRaster);
    expect(view.getProjection().getCode()).toBe(MARS_PROJECTED_CRS);
    expect(view.getCenter()).toEqual([4_584_880, 1_094_977.5]);
    expect(view.getResolution()).toBe(8);
    expect(view.getMaxZoom()).toBe(REAL_DATA_MAX_ZOOM);
  });
});
