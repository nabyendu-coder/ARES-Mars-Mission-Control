# Data sources

Verify every dataset before using it. Status: Pending, Downloaded, Verified, Rejected.

| Dataset | Mission / instrument | Purpose | File name | Date downloaded | Resolution | Coordinate system | Credit line | Status |
|---|---|---|---|---|---|---|---|---|
| HiRISE elevation (DTM) + matching image | Mars Reconnaissance Orbiter | Sharp elevation and photo | | | | | | Pending |
| MOLA elevation (backup) | Mars Global Surveyor | Regional elevation | | | | | | Pending |
| CTX imagery | Mars Reconnaissance Orbiter | Regional context | | | | | | Pending |
| Rover images | Curiosity / Perseverance | Photos at science stops | | | | | | Pending |
| Radiation | Curiosity RAD (Gale), verify | Dose estimate | | | | | | Pending |
| Temperature | THEMIS / REMS / MEDA, verify | Thermal layer | | | | | | Pending |

Note (verify): thermal data is usually much coarser than HiRISE elevation, and rover temperature readings are single points, not maps. State this in the project.

## Embedded 3D study dataset

| Layer | Embedded representation | Origin and handling | Status |
|---|---|---|---|
| Elevation | 1483 × 541 browser grid with 16-bit quantized values | Supplied `ares-data.js`; docs describe a downsampled HiRISE DTM | Embedded values are used by the 3D mesh and planner; source GeoTIFFs were not included for independent validation |
| Slope | Byte grid with declared scale in metadata | Supplied precomputed derivative | Provisional; documented east-west scale distortion and striped patch remain unresolved |
| Roughness | Byte grid with declared scale in metadata | Supplied precomputed derivative | Provisional relief index, not a boulder map |
| Slope classes | Four stored classes with thresholds 0–5°, 5–15°, 15–25°, >25° | Supplied classification; colors are a display palette | Provisional visual bins, not mobility or safety limits |
| Hillshade | Byte grid | Supplied display derivative | Embedded; source lineage not independently checked here |
| Optical imagery | Local embedded grayscale image | Supplied downsampled preview | The bundled app does not load the 1.19 GB original mosaic |

The browser dataset is byte-for-byte the one supplied in the creative UI archive; no source TIFFs were available in that archive. The app preserves observed/derived/provisional/modelled/assumed distinctions in its interface. The landing-site coordinate is documented as approximate. Environment temperature and radiation values are modelled or assumed context rather than Jezero measurements.

The continuous slope overlay uses a Viridis-style progression; the discrete slope classes retain their existing four thresholds and use a perceptually ordered matching palette. This changes visualization only, not the stored classes or any route-planning threshold.

## Renderer test (not a project dataset)

| Layer | Type | Source / credit | Coordinate system / extent | Status |
|---|---|---|---|---|
| Synthetic renderer test | Procedural SVG tiles; no measured values | Generated locally for interface and tile-grid testing; not NASA data | ESRI:103885; schematic 20 × 20 km extent centered at (0, 0), not geographically registered | Test-only; not scientific data |

This layer remains in the 2D fallback for regression testing and does not represent a location or measured scientific values.

## Prepared local display rasters

| Layer | File | Verified metadata | Display handling | Status |
|---|---|---|---|---|
| Optical Preview | `ARES_optical_preview_2m.tif` | 7416 × 2702, single-band Byte, 2 × 2.000370096 m pixels, NoData 0; Mars 2000 spherical equidistant-cylindrical CRS; extent X 4,577,464–4,592,296 m, Y 1,092,275–1,097,680 m | Raw grayscale display; NoData transparent | Metadata inspected; local XYZ endpoint pixel-validated |
| Hillshade | `ARES_hillshade_1m.tif` | 14832 × 5405, single-band Byte, 1 m pixels, NoData 0; same CRS and outer extent as Optical Preview | Raw grayscale display; NoData transparent | Metadata inspected; local XYZ endpoint pixel-validated |

Both sources remain in their original files and CRS; the app performs no source reprojection or derivative creation. The endpoint samples each source using its own geotransform. The optical and hillshade grids have different pixel spacing, so common outer bounds do not assert identical pixel alignment. No internal overviews were reported. Dataset attribution and scientific interpretation remain unverified and are not presented by the UI.

## Verified mission facts (from NASA pages)
- Three Forks sample depot: first tube 21 Dec 2022, last 28 Jan 2023. https://www.jpl.nasa.gov/images/pia25682-perseverances-three-forks-sample-depot-map/
- Cheyava Falls, found July 2024 at the northern edge of Neretva Vallis; later reported as a potential biosignature. https://www.nasa.gov/news-release/nasa-says-mars-rover-discovered-potential-biosignature-last-year/
- Perseverance mid-climb view of Jezero Crater, 27 Sep 2024. https://www.jpl.nasa.gov/images/pia26378-perseverances-mid-climb-view-of-jezero-crater/

## Facts to verify before use
Landing date (18 Feb 2021), Ingenuity first and last flights, first rock cores (Sep 2021). Check on mars.nasa.gov.

## Official resources (confirm each link works)
- NASA PDS: https://pds.nasa.gov/
- HiRISE: https://hirise.lpl.arizona.edu/
- Mars Trek: https://trek.nasa.gov/mars/
- NASA JPL: https://www.jpl.nasa.gov/
- USGS Astrogeology: https://astrogeology.usgs.gov/
