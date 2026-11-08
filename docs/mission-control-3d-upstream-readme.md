# ARES: Mars Mission Control

A browser app that turns your QGIS rasters of Jezero Crater into an interactive 3D terrain study and EVA planner.
Built for the NASA Space Apps Challenge 2026 (Interplanetary Survival Guide: Martian Map).

## Run it on Windows

**Option A (simplest):** double-click `index.html`. Use Chrome or Edge. No install needed; everything is in this folder.

**Option B (if the page stays blank):** open PowerShell in this folder and run
`python -m http.server 8000`, then open http://localhost:8000 in your browser.

You need a computer with WebGL (any recent laptop with Intel graphics works). The first load decodes about 7 MB of terrain data, which takes a second or two.

## What is real, and what is not

| Part | Status |
|---|---|
| Elevation, hillshade, orbital photo | Real NASA/USGS HiRISE data, shrunk for the browser |
| Slope, roughness, slope bins | Derived from the 1 m rasters, **provisional** |
| Routes, times, radiation dose, temperature | Simple models using **assumed** inputs |

The Data & Provenance module lists every layer, the checks computed from your files, and the known limits.
The 25 cm optical mosaic (1.19 GB) is **not** loaded: only the 2 m preview is used.

## Folder map

```
index.html            page shell
css/styles.css        all styling
js/model.js           decodes the data, coordinates, targets, route planner (no WebGL)
js/scene.js           3D terrain, layer painting, camera, hover probe
js/ui.js              the six modules, guided tour, Learn More popups
data/ares-data.js     generated browser data (about 7 MB)
pipeline/build_data.py  rebuilds data/ares-data.js from the six .tif files
vendor/               three.js r128 (MIT licence) and its controls
```

## Rebuild the data from your GeoTIFFs

```
pip install rasterio numpy pillow
python pipeline/build_data.py "C:\path\to\folder\with\the\tifs" .
```
The pipeline opens source rasters read-only. Before resampling it checks CRS, bounds, pixel alignment, resolution ratios, and the common analysis-grid dimensions. It uses source NoData metadata and validity masks; a downsampled cell is considered valid only when its full source footprint is valid, so partial edge coverage is not silently treated as safe terrain. It stops rather than silently stretching misaligned rasters. The generated JavaScript is written to a temporary file and replaces `data/ares-data.js` only after validation and encoding complete successfully.

## Tests

Run from the project root:

```
node tests/planner.test.js
python tests/pipeline.test.py
```

The planner tests cover real embedded-terrain routes and synthetic obstacle, diagonal-corner, slope-limit, NoData, coordinate, picking, and route-metric cases. The pipeline tests create temporary synthetic GeoTIFFs to verify aligned input processing and ensure a misaligned input fails without overwriting an existing output.

The EVA planner uses 20 m cells built from four 10 m browser cells. A cell is traversable only when all four underlying elevation and slope cells are valid and the maximum of their four 10 m slope values is at or below the selected limit. The displayed maximum route slope is therefore a maximum of the underlying 10 m values, not the 20 m average.

## Known limits (also shown in the app)

- The slope layer was made at the map's own scale, so east-west slopes read up to about 1.5 degrees low. Distances are corrected with cos(latitude); the slope layer is not yet.
- A straight-edged patch with horizontal striping in the west-middle of the 1 m slope data is unresolved.
- The landing-site position is from remembered coordinates and not verified.
- Slope bins and roughness are visual aids, not safety limits.

Credits: terrain and imagery from NASA/JPL/University of Arizona HiRISE and USGS. 3D library: three.js (MIT).


## Mission Command interface

The interface uses a terrain-first mission workstation layout: the 3D study region remains the visual focus, while the six existing modules are available from the top mission bar. Floating map instruments provide quick recentering, direct access to layer controls, and a collapsible analysis panel. Hovering the terrain continues to expose the existing scientific probe readout.

The visual treatment is intentionally restrained: dark instrument surfaces, Mars-amber accents, cyan analytical highlights, subtle grid/scan treatments, and compact data typography. These are interface effects only; they do not represent live spacecraft telemetry, real-time scanning, or additional scientific measurements.
