# Scientific values and assumptions

Classification: **Measured** (NASA observation), **Derived** (calculated from NASA data), **Modelled** (estimate), **Assumption** (my own choice).
Never present an assumption as a NASA measurement.

| Parameter | Value | Unit | Source | Classification | Used where in the app |
|---|---|---|---|---|---|
| Elevation | pending | metres | pending | Measured / Derived | 3D terrain |
| Terrain slope | pending | degrees | calculated from elevation | Derived | Hazard layer, route check |
| Slope limit for suited walking | pending | degrees | pending (search NASA suit-mobility studies) | Assumption until sourced | Slope slider default |
| Walking speed | pending | m/s | pending | Assumption / Sourced | EVA duration |
| Radiation dose rate | pending | mSv/day | pending (Curiosity RAD, verify) | Measured, from another site | Safety panel |
| Air temperature range | pending | degrees C | pending (rover weather data) | Measured / Modelled | Safety panel |
| EVA duration | calculated | hours | distance / walking speed | Derived | Mission summary |

Prototype values that must be replaced: all terrain heights (generated), stop positions (schematic), temperature curve (-81 to -5 C, assumed), slope limit (25 degrees, assumed), radiation 0.67 mSv/day (from memory; verify the paper).
