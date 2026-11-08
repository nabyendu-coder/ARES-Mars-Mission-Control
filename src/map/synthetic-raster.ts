import XYZ from "ol/source/XYZ.js";
import { getMarsProjectedProjection } from "./projection";
import {
  TEST_EXTENT,
  TEST_MAX_ZOOM,
  TEST_MIN_ZOOM,
  TEST_TILE_SIZE,
  getTestTileExtent,
  testTileGrid,
} from "./tile-grid";

export const TEST_RASTER_LABEL = "Synthetic renderer test — not scientific data";

function makeFeatureCircles(): string {
  let seed = 103885;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return (seed - 1) / 2_147_483_646;
  };
  const circles: string[] = [];

  for (let index = 0; index < 70; index += 1) {
    const x = TEST_EXTENT[0] + random() * (TEST_EXTENT[2] - TEST_EXTENT[0]);
    const y = TEST_EXTENT[1] + random() * (TEST_EXTENT[3] - TEST_EXTENT[1]);
    const radius = 70 + random() * 260;
    const rx = radius * (0.65 + random() * 0.7);
    const ry = radius * (0.55 + random() * 0.55);
    circles.push(
      `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" transform="rotate(${(random() * 70 - 35).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})" fill="none" stroke="#dac69d" stroke-opacity=".12" stroke-width="16"/>`,
      `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${(rx * 0.68).toFixed(2)}" ry="${(ry * 0.68).toFixed(2)}" transform="rotate(${(random() * 70 - 35).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})" fill="none" stroke="#3b4035" stroke-opacity=".2" stroke-width="10"/>`,
    );
  }
  return circles.join("");
}

const terrainFeatures = makeFeatureCircles();

export function createTestTileSvg(tileCoordinate: [number, number, number]): string {
  const extent = getTestTileExtent(tileCoordinate);
  const width = extent[2] - extent[0];
  const height = extent[3] - extent[1];
  const id = `tile-${tileCoordinate.join("-")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TEST_TILE_SIZE}" height="${TEST_TILE_SIZE}" viewBox="${extent[0]} ${-extent[3]} ${width} ${height}" role="img" aria-label="${TEST_RASTER_LABEL}">
    <defs>
      <linearGradient id="${id}-surface" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#9b8662"/>
        <stop offset=".48" stop-color="#726a50"/>
        <stop offset="1" stop-color="#454a3e"/>
      </linearGradient>
      <pattern id="${id}-grain" width="360" height="360" patternUnits="userSpaceOnUse">
        <path d="M0 96 C55 63 108 130 164 94 S271 75 360 112 M-40 224 C46 180 109 251 177 214 S294 194 400 235 M61 -30 C83 34 52 60 81 110 M290 178 C249 228 284 275 246 390" fill="none" stroke="#e1cfaa" stroke-opacity=".09" stroke-width="12"/>
        <path d="M-20 142 C44 108 103 170 158 136 S272 117 380 155 M-10 280 C39 244 112 306 182 269 S299 251 390 291" fill="none" stroke="#282f29" stroke-opacity=".13" stroke-width="8"/>
      </pattern>
    </defs>
    <g transform="scale(1,-1)">
      <rect x="${TEST_EXTENT[0]}" y="${-TEST_EXTENT[3]}" width="${TEST_EXTENT[2] - TEST_EXTENT[0]}" height="${TEST_EXTENT[3] - TEST_EXTENT[1]}" fill="url(#${id}-surface)"/>
      <rect x="${TEST_EXTENT[0]}" y="${-TEST_EXTENT[3]}" width="${TEST_EXTENT[2] - TEST_EXTENT[0]}" height="${TEST_EXTENT[3] - TEST_EXTENT[1]}" fill="url(#${id}-grain)"/>
      ${terrainFeatures}
    </g>
  </svg>`;
}

export function createSyntheticRasterSource(): XYZ {
  return new XYZ({
    projection: getMarsProjectedProjection(),
    tileGrid: testTileGrid,
    minZoom: TEST_MIN_ZOOM,
    maxZoom: TEST_MAX_ZOOM,
    wrapX: false,
    transition: 0,
    tileUrlFunction: (tileCoordinate) => {
      if (!tileCoordinate) return undefined;
      const svg = createTestTileSvg(tileCoordinate as [number, number, number]);
      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    },
  });
}
