import TileGrid from "ol/tilegrid/TileGrid.js";

export const TEST_EXTENT: [number, number, number, number] = [
  -10_000,
  -10_000,
  10_000,
  10_000,
];
export const TEST_TILE_SIZE = 256;
export const TEST_MIN_ZOOM = 0;
export const TEST_MAX_ZOOM = 4;
export const TEST_BASE_RESOLUTION = 39.0625;
export const REAL_DATA_EXTENT: [number, number, number, number] = [
  4_577_464,
  1_092_275,
  4_592_296,
  1_097_680,
];
export const REAL_DATA_TILE_SIZE = 256;
export const REAL_DATA_MIN_ZOOM = 0;
export const REAL_DATA_MAX_ZOOM = 7;
export const REAL_DATA_BASE_RESOLUTION = 128;

export const testTileGrid = new TileGrid({
  extent: TEST_EXTENT,
  origin: [TEST_EXTENT[0], TEST_EXTENT[3]],
  tileSize: TEST_TILE_SIZE,
  resolutions: Array.from(
    { length: TEST_MAX_ZOOM - TEST_MIN_ZOOM + 1 },
    (_, zoom) => TEST_BASE_RESOLUTION / (2 ** zoom),
  ),
});

export const realDataTileGrid = new TileGrid({
  extent: REAL_DATA_EXTENT,
  origin: [REAL_DATA_EXTENT[0], REAL_DATA_EXTENT[3]],
  tileSize: REAL_DATA_TILE_SIZE,
  resolutions: Array.from(
    { length: REAL_DATA_MAX_ZOOM - REAL_DATA_MIN_ZOOM + 1 },
    (_, zoom) => REAL_DATA_BASE_RESOLUTION / (2 ** zoom),
  ),
});

export function getTestTileExtent(tileCoordinate: [number, number, number]): [number, number, number, number] {
  return testTileGrid.getTileCoordExtent(tileCoordinate) as [number, number, number, number];
}
