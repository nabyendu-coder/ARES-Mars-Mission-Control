# Development log

Record every decision, dataset, bug fix and finished feature, with a date.

## 7 Nov 2026
- Project documentation started; GitHub repository created.
- Notes split into a short NOTES.md and detailed files in docs/.
- Challenge corrected to "Interplanetary Survival Guide: Martian Map".
- Site and datasets still pending.

## 8 Nov 2026
- Established the Milestone 1 React + TypeScript + OpenLayers app and registered Mars 2000 spherical CRS definitions ESRI:106971 / ESRI:103885 with Proj4.
- Added a schematic 20 × 20 km test extent, 256 px XYZ grid through zoom 4, a deterministic synthetic SVG renderer-test layer, and an injectable raster-source adapter.
- Added floating map controls, layer selection and opacity, a zoom-responsive grid, pointer coordinates, contextual test-only legend, and loading/error indicators.
- Added automated checks for CRS registration, coordinate transforms, extent, tile coverage/alignment and the OpenLayers test source.
- No original GIS dataset was available or modified. The test imagery is not scientific data; real raster alignment remains unverified.

## Decisions
| Date | Decision | Reason |
|---|---|---|
| 8 Nov 2026 | Use a synthetic local test-only layer behind a raster-source adapter for the initial OpenLayers proof of concept. | No verified raster is present; this permits projection/grid/UI testing without implying scientific validation or coupling the UI to a serving backend. |

## Template for new entries
### [date]
- What I did:
- What I learned:
- Problems:
- Next:
