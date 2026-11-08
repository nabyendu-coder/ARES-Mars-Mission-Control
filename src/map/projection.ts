import proj4 from "proj4";
import { get, transform } from "ol/proj.js";
import { register } from "ol/proj/proj4.js";
import type { Coordinate } from "ol/coordinate.js";
import type Projection from "ol/proj/Projection.js";

export const MARS_GEOGRAPHIC_CRS = "ESRI:106971";
export const MARS_PROJECTED_CRS = "ESRI:103885";
export const MARS_RADIUS_METERS = 3_396_190;

const marsGeographicDefinition = `+proj=longlat +R=${MARS_RADIUS_METERS} +no_defs +type=crs`;
const marsProjectedDefinition = `+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +R=${MARS_RADIUS_METERS} +units=m +no_defs +type=crs`;

proj4.defs(MARS_GEOGRAPHIC_CRS, marsGeographicDefinition);
proj4.defs(MARS_PROJECTED_CRS, marsProjectedDefinition);
register(proj4);

const marsGeographicProjection = get(MARS_GEOGRAPHIC_CRS);
const marsProjectedProjection = get(MARS_PROJECTED_CRS);

if (!marsGeographicProjection || !marsProjectedProjection) {
  throw new Error("OpenLayers could not register the Mars 2000 coordinate reference systems.");
}

marsProjectedProjection.setExtent([
  -Math.PI * MARS_RADIUS_METERS,
  -Math.PI * MARS_RADIUS_METERS / 2,
  Math.PI * MARS_RADIUS_METERS,
  Math.PI * MARS_RADIUS_METERS / 2,
]);

export function getMarsGeographicProjection(): Projection {
  if (!marsGeographicProjection) throw new Error("Mars geographic CRS registration failed.");
  return marsGeographicProjection;
}

export function getMarsProjectedProjection(): Projection {
  if (!marsProjectedProjection) throw new Error("Mars projected CRS registration failed.");
  return marsProjectedProjection;
}

export function marsGeographicToProjected(coordinate: Coordinate): Coordinate {
  return transform(coordinate, getMarsGeographicProjection(), getMarsProjectedProjection());
}

export function marsProjectedToGeographic(coordinate: Coordinate): Coordinate {
  return transform(coordinate, getMarsProjectedProjection(), getMarsGeographicProjection());
}
