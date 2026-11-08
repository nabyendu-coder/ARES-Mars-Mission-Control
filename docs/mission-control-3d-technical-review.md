# ARES technical correctness update

This copy contains focused correctness and validation improvements. The original uploaded ZIP and its embedded terrain data were left untouched.

## Implemented

- A* rejects diagonal corner cutting unless both orthogonal side cells are valid and within the selected slope limit.
- Start and destination indices are bounds-checked; a destination above the slope limit is no longer exempt.
- The 20 m route grid retains both mean and maximum of its four 10 m browser-cell slope values. Traversability uses the maximum; cost weighting and mean reporting retain the average as a separate value.
- Coarse cells containing invalid elevation or slope cells are blocked. Route paths are validated before being returned or measured.
- Route metrics distinguish maximum underlying 10 m slope from average slope.
- Terrain height interpolation follows the same two-triangle topology as the rendered mesh. Adaptive ray sampling is limited to at most about half a 10 m cell per horizontal step and does not accept intersections across NoData gaps.
- Projected and world coordinate transforms now use pixel-centre conventions, consistent with raster outer bounds.
- EVA route geometry follows sampled straight segments of the planned path; Catmull-Rom smoothing was removed. Samples are placed on the rendered terrain and routes are not drawn across NoData holes.
- Overlay cleanup disposes of both geometries and their owned materials.
- Google Fonts network requests were removed; system font fallbacks are used.
- The raster pipeline checks CRS, bounds, resolution relationships, pixel-lattice alignment, and analysis-grid dimensions before processing. It uses source masks/NoData metadata and invalidates downsampled cells unless their full source footprint is valid.
- Pipeline output is written to a temporary file and atomically replaces the generated JavaScript only after successful validation and encoding.
- Data provenance wording was corrected so the first-valid-column statistic is not described as a strip width.

## Tests run

- `node --check` on the application JavaScript and planner tests: passed.
- `python -m py_compile` on the pipeline and pipeline tests: passed.
- `node tests/planner.test.js`: **15/15 passed**. Includes real routes against the embedded Jezero data plus synthetic pathfinding, slope, NoData, coordinate, picking, and metric tests.
- `python tests/pipeline.test.py`: **3/3 passed**. Uses temporary synthetic GeoTIFFs to test aligned processing, strict NoData coverage, and rejection of misaligned inputs without overwriting existing output.
- Confirmed there are no external runtime URLs in the HTML, CSS, or application JavaScript.
- Confirmed `data/ares-data.js` is byte-for-byte unchanged from the uploaded ZIP.
- Confirmed the improved ZIP passes archive integrity testing.

## Not verified

- The original source GeoTIFFs were not included in the uploaded ZIP. Their actual CRS/alignment, source NoData conventions, and scientific values have not been revalidated. The pipeline's behavior was tested with synthetic rasters only.
- The pipeline was not run against the original TIFFs, and the existing generated browser data was not regenerated.
- Actual double-click operation in Windows Chrome/Edge was not verified in this environment.
- A headless Chromium attempt could not initialize its graphics backend here, so actual WebGL rendering, browser interaction, and GPU performance remain unverified.

## Scientific limitations retained

- The slope layer is still the existing provisional derivative; the documented east-west slope distortion has not been recomputed.
- The striped slope-data patch remains unresolved.
- The landing-site coordinates remain provisional and unverified.
- The 25 cm optical mosaic is still not loaded; the existing 2 m preview remains in use.
- Radiation, temperature, walking speed, and other stated assumptions remain assumptions/model inputs.

## Data integrity

`data/ares-data.js` was not edited. All improvements are in source code, tests, documentation, and runtime presentation. The original uploaded ZIP remains available separately as the rollback copy.
