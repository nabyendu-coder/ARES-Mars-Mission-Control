#!/usr/bin/env python3
"""Read-only local XYZ tile endpoint for the prepared ARES Mars rasters."""

from __future__ import annotations

import argparse
import io
import json
import logging
import math
import os
import threading
from collections import OrderedDict
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import numpy as np
from osgeo import gdal, osr
from PIL import Image

gdal.UseExceptions()

MIN_X = 4_577_464.0
MIN_Y = 1_092_275.0
MAX_X = 4_592_296.0
MAX_Y = 1_097_680.0
WIDTH_METERS = MAX_X - MIN_X
HEIGHT_METERS = MAX_Y - MIN_Y
TILE_SIZE = 256
MIN_ZOOM = 0
MAX_ZOOM = 7
BASE_RESOLUTION = 128.0
NODATA_VALUE = 0
CACHE_LIMIT = 128

DATASETS = {
    "optical": {
        "label": "Optical preview (grayscale)",
        "path": r"C:\Users\NABYENDU GHOSH\Downloads\Ares Claude upload\ARES_optical_preview_2m.tif",
        "pixel_size_x": 2.0,
        "pixel_size_y": 2.000370096225018,
        "width": 7416,
        "height": 2702,
    },
    "hillshade": {
        "label": "Hillshade",
        "path": r"C:\Users\NABYENDU GHOSH\Downloads\ARES_hillshade_1m.tif",
        "pixel_size_x": 1.0,
        "pixel_size_y": 1.0,
        "width": 14832,
        "height": 5405,
    },
}

LOGGER = logging.getLogger("ares.gdal_xyz")
_CACHE: OrderedDict[tuple[str, int, int, int], bytes] = OrderedDict()
_CACHE_LOCK = threading.Lock()
_CRS_LOCK = threading.Lock()
_REFERENCE_SRS: osr.SpatialReference | None = None


class TileRequestError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class RasterInfo:
    config: dict
    geotransform: tuple[float, ...]
    nodata: float
    projection_wkt: str


def _raster_info(dataset_name: str) -> RasterInfo:
    global _REFERENCE_SRS
    config = DATASETS[dataset_name]
    if not os.path.isfile(config["path"]):
        raise RuntimeError(f"Configured source raster is missing: {config['path']}")

    dataset = gdal.Open(config["path"], gdal.GA_ReadOnly)
    if dataset is None:
        raise RuntimeError(f"GDAL could not open source raster: {config['path']}")

    try:
        geotransform = dataset.GetGeoTransform()
        if dataset.RasterXSize != config["width"] or dataset.RasterYSize != config["height"]:
            raise RuntimeError(f"{dataset_name} dimensions differ from the inspected source metadata.")
        if dataset.RasterCount != 1:
            raise RuntimeError(f"{dataset_name} must be a single-band raster for this proof of concept.")

        expected = (
            MIN_X,
            config["pixel_size_x"],
            0.0,
            MAX_Y,
            0.0,
            -config["pixel_size_y"],
        )
        if any(abs(actual - target) > 1e-7 for actual, target in zip(geotransform, expected)):
            raise RuntimeError(f"{dataset_name} geotransform differs from the inspected source metadata.")

        band = dataset.GetRasterBand(1)
        nodata = band.GetNoDataValue()
        if nodata != NODATA_VALUE:
            raise RuntimeError(f"{dataset_name} NoData is {nodata!r}; expected {NODATA_VALUE}.")

        projection_wkt = dataset.GetProjection()
        if not projection_wkt:
            raise RuntimeError(f"{dataset_name} has no projected CRS metadata.")
        spatial_reference = osr.SpatialReference()
        spatial_reference.ImportFromWkt(projection_wkt)
        if spatial_reference.IsProjected() != 1:
            raise RuntimeError(f"{dataset_name} CRS is not projected.")
        if not math.isclose(spatial_reference.GetLinearUnits(), 1.0, abs_tol=1e-12):
            raise RuntimeError(f"{dataset_name} projected units are not metres.")
        if not math.isclose(spatial_reference.GetSemiMajor(), 3_396_190.0, abs_tol=1e-8):
            raise RuntimeError(f"{dataset_name} CRS does not use the inspected Mars sphere radius.")

        spatial_reference.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
        with _CRS_LOCK:
            if _REFERENCE_SRS is None:
                _REFERENCE_SRS = spatial_reference.Clone()
            elif not bool(_REFERENCE_SRS.IsSame(spatial_reference)):
                raise RuntimeError("The configured rasters do not use the same CRS.")

        x_max = geotransform[0] + dataset.RasterXSize * geotransform[1]
        y_min = geotransform[3] + dataset.RasterYSize * geotransform[5]
        if not (
            math.isclose(x_max, MAX_X, abs_tol=1e-6)
            and math.isclose(y_min, MIN_Y, abs_tol=1e-6)
        ):
            raise RuntimeError(f"{dataset_name} raster bounds differ from the inspected shared extent.")

        return RasterInfo(config, tuple(geotransform), nodata, projection_wkt)
    finally:
        dataset = None


def _tile_extent(zoom: int, x: int, y: int) -> tuple[float, float, float, float, float]:
    resolution = BASE_RESOLUTION / (2**zoom)
    span = TILE_SIZE * resolution
    columns = math.ceil(WIDTH_METERS / span)
    rows = math.ceil(HEIGHT_METERS / span)
    if x < 0 or y < 0 or x >= columns or y >= rows:
        raise TileRequestError(404, "Tile coordinate is outside the configured raster extent.")

    left = MIN_X + x * span
    top = MAX_Y - y * span
    return left, top - span, left + span, top, resolution


def _render_tile(dataset_name: str, zoom: int, x: int, y: int) -> bytes:
    info = _raster_info(dataset_name)
    left, bottom, right, top, resolution = _tile_extent(zoom, x, y)

    columns = left + (np.arange(TILE_SIZE, dtype=np.float64) + 0.5) * resolution
    rows = top - (np.arange(TILE_SIZE, dtype=np.float64) + 0.5) * resolution
    source_columns = np.floor((columns - info.geotransform[0]) / info.geotransform[1]).astype(np.int64)
    source_rows = np.floor((info.geotransform[3] - rows) / -info.geotransform[5]).astype(np.int64)

    valid_columns = np.flatnonzero((source_columns >= 0) & (source_columns < info.config["width"]))
    valid_rows = np.flatnonzero((source_rows >= 0) & (source_rows < info.config["height"]))
    tile_values = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.uint8)
    alpha = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.uint8)

    if valid_columns.size and valid_rows.size:
        min_column = int(source_columns[valid_columns].min())
        max_column = int(source_columns[valid_columns].max())
        min_row = int(source_rows[valid_rows].min())
        max_row = int(source_rows[valid_rows].max())

        dataset = gdal.Open(info.config["path"], gdal.GA_ReadOnly)
        if dataset is None:
            raise RuntimeError(f"GDAL could not reopen source raster: {info.config['path']}")
        try:
            source_window = dataset.GetRasterBand(1).ReadAsArray(
                min_column,
                min_row,
                max_column - min_column + 1,
                max_row - min_row + 1,
            )
        finally:
            dataset = None

        source_values = source_window[
            np.ix_(
                source_rows[valid_rows] - min_row,
                source_columns[valid_columns] - min_column,
            )
        ]
        tile_values[np.ix_(valid_rows, valid_columns)] = source_values
        alpha[np.ix_(valid_rows, valid_columns)] = np.where(
            source_values == info.nodata, 0, 255
        ).astype(np.uint8)

    rgba = np.empty((TILE_SIZE, TILE_SIZE, 4), dtype=np.uint8)
    rgba[:, :, 0] = tile_values
    rgba[:, :, 1] = tile_values
    rgba[:, :, 2] = tile_values
    rgba[:, :, 3] = alpha

    output = io.BytesIO()
    Image.fromarray(rgba, mode="RGBA").save(output, format="PNG", compress_level=1)
    return output.getvalue()


def _cached_tile(dataset_name: str, zoom: int, x: int, y: int) -> bytes:
    key = (dataset_name, zoom, x, y)
    with _CACHE_LOCK:
        cached = _CACHE.get(key)
        if cached is not None:
            _CACHE.move_to_end(key)
            return cached

    rendered = _render_tile(dataset_name, zoom, x, y)
    with _CACHE_LOCK:
        existing = _CACHE.get(key)
        if existing is not None:
            _CACHE.move_to_end(key)
            return existing
        _CACHE[key] = rendered
        while len(_CACHE) > CACHE_LIMIT:
            _CACHE.popitem(last=False)
    return rendered


class TileHandler(BaseHTTPRequestHandler):
    server_version = "ARES-GDAL-XYZ/0.1"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path_parts = parsed.path.strip("/").split("/")

        if parsed.path == "/health":
            self._send_json(200, {"status": "ok", "gdal": gdal.VersionInfo("--version")})
            return
        if parsed.path == "/datasets":
            self._send_json(
                200,
                {
                    key: {
                        "label": config["label"],
                        "extent": [MIN_X, MIN_Y, MAX_X, MAX_Y],
                        "tileSize": TILE_SIZE,
                        "minZoom": MIN_ZOOM,
                        "maxZoom": MAX_ZOOM,
                        "resolution": "128 / 2^z metres per pixel",
                    }
                    for key, config in DATASETS.items()
                },
            )
            return

        if len(path_parts) != 5 or path_parts[0] != "tiles" or not path_parts[4].endswith(".png"):
            self._send_json(404, {"error": "Use /tiles/{optical|hillshade}/{z}/{x}/{y}.png"})
            return

        dataset_name = path_parts[1]
        if dataset_name not in DATASETS:
            self._send_json(404, {"error": "Unknown raster layer."})
            return
        try:
            zoom = int(path_parts[2])
            x = int(path_parts[3])
            y = int(path_parts[4][:-4])
        except ValueError:
            self._send_json(400, {"error": "Tile z, x, and y must be integers."})
            return
        if not MIN_ZOOM <= zoom <= MAX_ZOOM:
            self._send_json(404, {"error": f"Zoom must be between {MIN_ZOOM} and {MAX_ZOOM}."})
            return

        try:
            _tile_extent(zoom, x, y)
            png = _cached_tile(dataset_name, zoom, x, y)
        except TileRequestError as error:
            self._send_json(error.status, {"error": str(error)})
            return
        except Exception as error:
            LOGGER.exception("Failed to render %s z=%s x=%s y=%s", dataset_name, zoom, x, y)
            self._send_json(500, {"error": f"Tile rendering failed: {error}"})
            return

        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(png)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(png)

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string: str, *args: object) -> None:
        LOGGER.info("%s - %s", self.address_string(), format_string % args)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    for dataset_name in DATASETS:
        info = _raster_info(dataset_name)
        LOGGER.info(
            "Validated %s: %s (%sx%s), NoData=%s",
            dataset_name,
            info.config["path"],
            info.config["width"],
            info.config["height"],
            info.nodata,
        )

    server = ThreadingHTTPServer((args.host, args.port), TileHandler)
    server.daemon_threads = True
    LOGGER.info(
        "Serving read-only Mars XYZ tiles at http://%s:%s (extent %.0f,%.0f,%.0f,%.0f)",
        args.host,
        args.port,
        MIN_X,
        MIN_Y,
        MAX_X,
        MAX_Y,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOGGER.info("Shutting down tile service.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
