# ARES local GDAL XYZ proof of concept

This isolated prototype serves read-only display tiles from the prepared source TIFFs. It does not import into or modify the React/OpenLayers app, source TIFFs, or TIFF sidecars. It writes no raster derivatives. Rendered PNGs exist only in the HTTP response and bounded in-memory cache.

## Requirements already present in the QGIS installation

- QGIS-bundled Python 3.12 and `osgeo.gdal` 3.13.3.
- NumPy and Pillow in that Python environment.
- Python standard-library `http.server`.

No packages were installed for this prototype. The shell must use QGIS GDAL/PROJ paths and the QGIS data directories, because the default system Python does not include `osgeo`.

## Start the local endpoint

In PowerShell, from the repository root:

```powershell
$qgis = 'C:\Program Files\QGIS 3.44.15'
$env:PATH = "$qgis\bin;$qgis\apps\gdal\bin;$env:PATH"
$env:GDAL_DATA = "$qgis\share\gdal"
$env:PROJ_LIB = "$qgis\share\proj"
& "$qgis\apps\Python312\python.exe" .\prototypes\gdal-xyz\server.py
```

The server binds to `127.0.0.1:8765` by default. It serves:

- `GET /health`
- `GET /datasets`
- `GET /tiles/optical/{z}/{x}/{y}.png`
- `GET /tiles/hillshade/{z}/{x}/{y}.png`

Only the two configured dataset identifiers are accepted; request paths cannot select arbitrary files.

## Tile matrix

The local grid uses the verified projected extent `X=[4577464, 4592296]`, `Y=[1092275, 1097680]` in the shared Mars spherical equidistant-cylindrical CRS. XYZ row zero starts at the north edge. Tiles are 256 × 256 pixels. Resolution is `128 / 2^z` projected metres per pixel for zooms 0 through 7. This provides 2 m/px at z6 (near the optical preview's native spacing) and 1 m/px at z7 (the hillshade's native spacing). Partial tiles outside the raster bounds render transparent.

Pixel centers select the nearest source sample using each dataset's own geotransform. Source files are opened read-only. Byte values equal to NoData 0, and pixels outside the source bounds, receive alpha 0. Valid grayscale values are returned as equal RGB channels with alpha 255.

## Verify and benchmark

With the service running, in another QGIS-configured PowerShell:

```powershell
$qgis = 'C:\Program Files\QGIS 3.44.15'
$env:PATH = "$qgis\bin;$qgis\apps\gdal\bin;$env:PATH"
$env:GDAL_DATA = "$qgis\share\gdal"
$env:PROJ_LIB = "$qgis\share\proj"
& "$qgis\apps\Python312\python.exe" .\prototypes\gdal-xyz\verify_tiles.py
```

The verifier compares every output pixel and alpha value with direct GDAL reads from the source TIFF. It checks representative sample tiles (optical z6 and hillshade z7) and explicit mixed-validity NoData tiles (both at z6, x=1, y=0), then measures first/cached repeat response time for both datasets at z0, z3, z5, z6, and z7. The first request includes HTTP, raster read, sampling, and PNG encoding; the repeat benefits from the in-memory response cache. Measurements are local and are not a production performance guarantee.

## Known limitations

- This is a minimal, single-process development server, not a production tile service. It has no authentication, external bind, persistent cache, throttling, or deployment configuration.
- QGIS Server, Flask, FastAPI, and aiohttp were not found in the inspected environment.
- The source TIFFs are uncompressed and strip-organized without reported overviews. `ReadAsArray` reads only the needed source window at the nearest sample resolution, but the TIFF's strip organization may still make access slower than tiled/overviewed inputs. No COG, overview, or other derivative is made here.
- Optical tiles are grayscale by source band. This prototype does no contrast stretch or scientific recoloring.
- The renderer uses nearest-neighbor source sampling and a single common display grid. It does not create aligned raster pixels; the optical north-south spacing remains approximately 2.000370096 m while hillshade spacing is 1 m.
- The service validates raster dimensions, geotransforms, shared CRS, metre units, sphere radius, and NoData on startup/request. It does not establish scientific accuracy or pixel-level co-registration beyond the tested source samples.
