# Architecture and workflow

## Mission Control and Surface Explorer

The default experience is the offline-capable Three.js mission workstation in `public/mission-control/`; the earlier React + TypeScript + OpenLayers Surface Explorer remains available at `/?view=map`. The mission application is served as static files by Vite and can also open directly from its `index.html`; its embedded model handles terrain inspection and route calculations without a backend service. The 2D fallback continues to use the local GDAL XYZ process.

The 3D experience uses the provided model/rendering code, locally vendored Three.js r128, and the embedded ~10 m browser dataset. It includes orbit/pan/zoom, terrain hover picking, targets, optical/hillshade/elevation/slope/roughness/slope-bin visualization, layer opacity, vertical exaggeration, sun controls, an EVA planner, route profiles, environment display, and data provenance. The study dataset remains the one supplied in the attached application archive; its underlying TIFF inputs were not part of that archive and have not been independently validated in this integration.

The OpenLayers fallback supports 2D pan/zoom, opacity, legends, coordinate readout, and a tile-grid overlay. It retains the synthetic test texture, Optical Preview, Hillshade, and grid-only selection. EVA simulation is not part of the 2D fallback.

## Coordinate reference system and extents

The projected map uses **ESRI:103885, Mars 2000 Equidistant Cylindrical (sphere)**. Its Proj4 definition uses a spherical radius of 3,396,190 m, zero standard parallel, central meridian, false easting, and false northing, and metre units. The corresponding Mars 2000 geographic CRS is registered as ESRI:106971. The definition was checked against the OSGeo PROJ CRS registry (`PROJ-CRS-Explorer/wkt1/ESRI/103885.txt`, retrieved 8 Nov 2026).

The synthetic renderer uses `[-10,000, -10,000, 10,000, 10,000]` metres, a schematic test window centered at the projection origin and not a selected or georeferenced Mars site.

The two prepared display rasters share the verified projected extent `[4,577,464, 1,092,275, 4,592,296, 1,097,680]` metres. Their inspected CRS definitions and outer bounds match the registered Mars CRS; the frontend uses that CRS directly and does not request reprojection. Their native pixel grids differ: optical is 7416 × 2702 at `(2, -2.000370096225018)` m/pixel and hillshade is 14832 × 5405 at `(1, -1)` m/pixel. Both are single-band Byte rasters with NoData 0. No internal overviews were reported.

## Raster source boundary and tile matrix

`src/map/raster-source.ts` defines the `RasterSourceAdapter` contract: a `TileSource` factory, extent, tile grid, zoom range, display label, and legend metadata. The `syntheticTestRaster`, `opticalPreviewRaster`, and `hillshadeRaster` implementations share that contract. The map controls consume the adapter metadata and do not depend on a particular tile backend.

The synthetic source uses its original 256 × 256 test grid, zoom levels 0–4, and 39.0625 m/pixel at zoom 0. Real sources use the endpoint's 256 × 256 XYZ grid, zoom levels 0–7, and `128 / 2^z` projected metres/pixel. It is 2 m/pixel at z6 and 1 m/pixel at z7. The grid overlay is generated from the active adapter's tile grid and extent.

The real source URLs are `/gdal/tiles/optical/{z}/{x}/{y}.png` and `/gdal/tiles/hillshade/{z}/{x}/{y}.png`. Vite's development proxy forwards `/gdal/*` to `http://127.0.0.1:8765/*`, avoiding browser CORS configuration. The separately launched, Python/GDAL endpoint reads the two configured original TIFFs read-only and returns grayscale RGBA PNG tiles; the endpoint's verified NoData mask is preserved as alpha transparency. Its run and validation details are in [`../prototypes/gdal-xyz/README.md`](../prototypes/gdal-xyz/README.md).

## Dependencies and local development

- 3D: local vendored Three.js r128, OrbitControls, and CSS2DRenderer; no external runtime URLs or additional 3D package installation.
- Frontend runtime: React, React DOM, OpenLayers, and Proj4.
- Frontend development: TypeScript, Vite, the Vite React plugin, and Vitest.
- Raster endpoint runtime: the already-installed QGIS-bundled Python 3.12.15, GDAL Python bindings 3.13.3, NumPy, Pillow, and Python standard-library `http.server`. It is a separate process and is not launched by Vite.
- `npm.cmd test` runs the projection, grid, source, selection, legend, opacity, and visibility checks.
- `npm.cmd run build` type-checks and creates the production bundle.
- `npm.cmd run dev` starts the frontend. Start the local endpoint separately as documented in the prototype README.
- `npm.cmd test` also runs the embedded-data A* route-planner regression tests.
- GeoTIFF pipeline tests require rasterio; they are preserved separately and were not runnable in the current environment.

## Validation and deployment limits

The local GDAL endpoint was validated against direct GDAL reads: every output pixel and alpha value matched nearest source samples in representative tiles, and mixed-validity tiles confirmed transparent NoData for both layers. The browser integration has also been checked visually for both rasters, source switching, opacity, zoom, projected/geographic coordinate readout, grid-only mode, and the synthetic layer. The browser fetched both NoData test tiles through Vite's proxy and observed the expected transparent and valid-pixel counts. Automated tests cover adapter selection/contracts, endpoint URLs, real extent/grid, CRS, display legend, and layer source/opacity/visibility behavior.

The attached app's technical review reports unresolved slope distortion, a striped slope-data patch, and an approximate/unverified landing-site position. Its HTML/CSS/JavaScript are copied into `public/mission-control`; the embedded data is preserved byte-for-byte and no TIFFs or derivatives were generated. Pipeline tests require rasterio, which is not present in the inspected system or QGIS Python environments; no package was installed. Do not treat the embedded data or planner outputs as fully revalidated science.

The 2D GDAL endpoint is **local development only**, not production ready. It is a minimal local HTTP server bound to loopback, without authentication, persistent cache, throttling, or deployment settings. Production must provide a reachable raster service and same-origin routing. The source TIFFs are uncompressed and strip-organized without reported overviews; request speed may vary. The two display rasters share outer extent but have distinct pixel spacing; integration does not assert identical pixel alignment.

The 3D planner is a browser-side model, not a server API. Its A* route-cost calculations use a 20 m coarse grid built from the supplied data; model tests cover corner cutting, invalid cells, slope limits, coordinate conversions, terrain picking, and route metrics. Planned route times use an explicitly assumed walking speed. Routes and environment displays are planning aids, not safety guarantees or real-time measurements.
