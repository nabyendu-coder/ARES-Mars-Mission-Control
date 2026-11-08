# ARES: Mars Mission Control

ARES opens into an offline-capable, interactive 3D terrain study and EVA-planning interface using the supplied Jezero browser dataset. The React/OpenLayers Surface Explorer with the validated local GDAL XYZ optical and hillshade layers remains available as a 2D view.

## Run locally

```powershell
npm.cmd install
npm.cmd test
npm.cmd run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) for Mission Control. Use **2D raster map** in the mission header for the OpenLayers fallback. The 2D real-raster options require the separately started local endpoint documented in [`prototypes/gdal-xyz/README.md`](prototypes/gdal-xyz/README.md); the 3D experience uses its local embedded data and needs no API service.

The 3D display supports terrain orbit/pan/zoom, hover probing, terrain targets, optical/elevation/hillshade/slope/roughness/slope-bin layers, vertical exaggeration, sun controls, an A* EVA planner, route metrics and elevation profile, modeled environment view, and data provenance. Embedded scientific layers and computations are not a substitute for source-data validation. The app labels derived, provisional, modeled, and assumed values; known limitations are in the Data & Provenance module and [`docs/mission-control-3d-technical-review.md`](docs/mission-control-3d-technical-review.md).

## Data preparation

The included source pipeline is [`prototypes/mission-control-3d/pipeline/build_data.py`](prototypes/mission-control-3d/pipeline/build_data.py). It reads source rasters and writes a validated browser data bundle to a chosen output project directory. It requires Python packages `rasterio`, `numpy`, and `pillow`. The pipeline's synthetic GeoTIFF tests are in `prototypes/mission-control-3d/tests/pipeline.test.py`; they were not run in this environment because rasterio is unavailable and no dependencies were installed.

The embedded browser data was copied unchanged from the supplied application archive. No original TIFFs, sidecars, or scientific source datasets were modified.
