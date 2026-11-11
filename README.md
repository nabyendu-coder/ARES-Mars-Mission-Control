# ARES — Mars Mission Control

ARES is an offline-capable, browser-based Mars terrain study and EVA route-planning interface for an embedded Jezero-region dataset. It combines an interactive Solar System, a staged Mars arrival, a Three.js terrain workstation, scientific context panels, and a local Copilot help panel.

ARES is a visualization and research prototype. It does not provide mission-certified route guidance, astronaut safety limits, live telemetry, or live NASA data.

## Run locally

The application is static and does not require npm packages or an internet connection at runtime. It does require a modern browser with WebGL support and Python 3 to start the local server.

### Windows PowerShell

From the project folder, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

If `python` is unavailable, try:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in Chrome, Edge, or another WebGL-capable browser. Keep the server process running while you use ARES. Press **Ctrl+C** in that terminal to stop it.

### macOS or Linux

From the project folder, run `python3 -m http.server 8000 --bind 127.0.0.1`, then open the same local address.

## Use the application

The opening view presents the Solar System. Select one of the eight planets using the planet rail or click its rendered body. Drag to orbit, scroll to zoom, use **Pause Motion** and **Orbit Rate** to control the schematic simulation, and select **Re-center** to restore the overview. Choose **Begin Mars Expedition** to run the staged approach and terrain handoff.

After arrival, the top navigation opens six mission modules:

- **Mission Overview** — embedded study-area extent, elevation coverage, and data-status labels.
- **Surface Explorer** — orbital photo and hillshade controls, elevation/slope/roughness/slope-bin overlays, opacity, and height exaggeration.
- **EVA Planner** — choose map start and destination points or load the demo route; compare shortest and slope-weighted routes, distance, estimated time, climb, maximum slope, and elevation profile.
- **Science Targets** — inspect the approximate landing reference and derived terrain extrema.
- **Environment** — adjust the local-time visualization and review simplified temperature and radiation estimates.
- **Data & Provenance** — inspect data-status labels, embedded quality metadata, source links, and known limitations.

The terrain view supports orbit, zoom, recenter, terrain probing, and a return to the Solar System. The **Mission Guide** provides a short in-app walkthrough.

## ARES Copilot

The Copilot is a small, deterministic local help guide. It matches phrases against a fixed set of topics about ARES, Jezero, terrain layers, route-planner behavior, controls, and documented limitations. It is **not** an LLM, does not query NASA or live telemetry, and does not operate the camera or assess route safety. It may not understand questions outside its written topics.

Messages are rendered as text. Empty and oversized inputs receive guidance, Enter submits a question, Escape closes the panel, and the conversation history is bounded for the current page session.

## Data integrity and scientific limitations

The application loads a pre-generated browser analysis product from `data/ares-data.js`. The original source GeoTIFFs and georeferencing files are not included in this repository, so this build cannot independently revalidate the source rasters. The app does not download live NASA data.

Keep the following limits in mind:

- The displayed elevation grid is derived from an approximately 1 m source product and rendered at about 10 m browser resolution.
- Slope products are provisional. The documentation records an east–west scale bias and an unresolved striped patch.
- Perseverance touchdown coordinates (18.44463° N, 77.45088° E) are used as a reference; placement on the embedded raster is approximate.
- The 25 cm optical mosaic is not included. A 2 m preview is used in the browser product.
- The 20 m-grid A* planner blocks invalid cells and cells above the user-selected slope limit. “Gentlest” adds a slope-weighted path cost; it does not mean safe. The limit is an assumption, not an astronaut or NASA safety standard.
- Route time is distance divided by an assumed walking speed. Environmental outputs are simplified models and assumptions, not mission forecasts.
- Terrain classes and visual layers are decision-support aids, not certified astronaut safety limits.
- Planetary maps have different coverage and resolution. Orbital distances, body sizes, and simulation rates are schematic; the cinematic arrival is not a spacecraft-entry simulation.

Read **Data & Provenance**, [TECHNICAL_REVIEW.md](TECHNICAL_REVIEW.md), and [assets/planet-maps/README.md](assets/planet-maps/README.md) before interpreting the values or planetary maps scientifically.

## Project layout

```text
index.html                 Application shell
css/styles.css             Interface and responsive layouts
js/solar-system.js         Planetary rendering, controls, and arrival sequence
js/scene.js                Terrain renderer, camera, overlays, and picking
js/model.js                Raster decoding, coordinate transforms, and A* planner
js/ui.js                   Mission modules and controls
js/copilot-brain.js        Local Copilot matching and interaction
js/orbit-math.js           Period-based orbital and axial motion helpers
data/ares-data.js          Embedded browser analysis product
assets/planet-maps/        Bundled planetary maps and attribution notes
vendor/                    Local Three.js renderers and OrbitControls
pipeline/build_data.py     Optional GeoTIFF-to-browser-data builder
tests/                     Planner, motion, arrival, Copilot, and pipeline checks
```

## Run the checks

Node.js is required for the JavaScript checks. From the project folder, run:

```powershell
node --check js/solar-system.js
node --check js/model.js
node --check js/scene.js
node --check js/ui.js
node --check js/copilot-brain.js
node --check js/orbit-math.js
node tests/copilot.test.js
node tests/planner.test.js
node tests/solar-motion.test.js
node tests/arrival-lifecycle.test.js
```

The raster-pipeline tests create synthetic GeoTIFF fixtures and require Python packages **NumPy** and **Rasterio**:

```powershell
python tests/pipeline.test.py
```

These synthetic fixtures test pipeline handling and do not independently validate the source rasters used to create the embedded product.

## Runtime dependencies

The runtime uses the libraries bundled in `vendor/` and planetary maps in `assets/`. It makes no external CDN, remote-font, package-registry, or API calls when the application is running locally.
