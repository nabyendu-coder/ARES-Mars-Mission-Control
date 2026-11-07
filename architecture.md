# Architecture and workflow

## Tools
VS Code, QGIS, GitHub, Python (optional), screen recorder for the demo.

## App
HTML, CSS, JavaScript and Three.js (3D). Starting point: the AI-made 3D prototype.

## Features
1. Interactive 3D terrain from real elevation
2. Slope visualization and hazard layer
3. Optical imagery layer
4. Hand-traced astronaut route
5. Science stops with photos and credits
6. Distance and estimated EVA duration
7. Radiation and temperature information, only if backed by verified data
8. An "assumed vs real" panel

## Data workflow
1. Obtain the original NASA datasets.
2. Check metadata, coordinate system and units.
3. Open in QGIS.
4. Make hillshade and slope.
5. Check the results against the original photo.
6. Resample elevation to about 400 x 400.
7. Export to JSON.
8. Load into the 3D app (use the real metres per pixel for slope).
9. Validate the app against the original dataset (compare spot elevations and the route length).
