#!/usr/bin/env python3
"""Benchmark and verify XYZ PNG responses directly against source TIFF pixels."""

from __future__ import annotations

import argparse
import json
import math
import time
import urllib.error
import urllib.request

import numpy as np
from osgeo import gdal
from PIL import Image

import server

gdal.UseExceptions()


def center_tile(zoom: int) -> tuple[int, int]:
    resolution = server.BASE_RESOLUTION / (2**zoom)
    span = server.TILE_SIZE * resolution
    center_x = (server.MIN_X + server.MAX_X) / 2
    center_y = (server.MIN_Y + server.MAX_Y) / 2
    x = math.floor((center_x - server.MIN_X) / span)
    y = math.floor((server.MAX_Y - center_y) / span)
    return x, y


def get_tile(base_url: str, dataset_name: str, zoom: int, x: int, y: int) -> tuple[bytes, float]:
    url = f"{base_url}/tiles/{dataset_name}/{zoom}/{x}/{y}.png"
    started = time.perf_counter()
    with urllib.request.urlopen(url, timeout=30) as response:
        if response.status != 200 or response.headers.get_content_type() != "image/png":
            raise RuntimeError(f"Unexpected tile response for {url}: {response.status}, {response.headers}")
        payload = response.read()
    return payload, (time.perf_counter() - started) * 1000


def direct_reference(dataset_name: str, zoom: int, x: int, y: int) -> tuple[np.ndarray, np.ndarray]:
    config = server.DATASETS[dataset_name]
    dataset = gdal.Open(config["path"], gdal.GA_ReadOnly)
    if dataset is None:
        raise RuntimeError(f"GDAL could not open {config['path']}")
    try:
        geotransform = dataset.GetGeoTransform()
        resolution = server.BASE_RESOLUTION / (2**zoom)
        span = server.TILE_SIZE * resolution
        left = server.MIN_X + x * span
        top = server.MAX_Y - y * span
        columns = left + (np.arange(server.TILE_SIZE, dtype=np.float64) + 0.5) * resolution
        rows = top - (np.arange(server.TILE_SIZE, dtype=np.float64) + 0.5) * resolution
        source_columns = np.floor((columns - geotransform[0]) / geotransform[1]).astype(np.int64)
        source_rows = np.floor((geotransform[3] - rows) / -geotransform[5]).astype(np.int64)
        valid_columns = np.flatnonzero((source_columns >= 0) & (source_columns < dataset.RasterXSize))
        valid_rows = np.flatnonzero((source_rows >= 0) & (source_rows < dataset.RasterYSize))

        values = np.zeros((server.TILE_SIZE, server.TILE_SIZE), dtype=np.uint8)
        alpha = np.zeros((server.TILE_SIZE, server.TILE_SIZE), dtype=np.uint8)
        if valid_columns.size and valid_rows.size:
            min_column = int(source_columns[valid_columns].min())
            max_column = int(source_columns[valid_columns].max())
            min_row = int(source_rows[valid_rows].min())
            max_row = int(source_rows[valid_rows].max())
            window = dataset.GetRasterBand(1).ReadAsArray(
                min_column,
                min_row,
                max_column - min_column + 1,
                max_row - min_row + 1,
            )
            samples = window[
                np.ix_(
                    source_rows[valid_rows] - min_row,
                    source_columns[valid_columns] - min_column,
                )
            ]
            values[np.ix_(valid_rows, valid_columns)] = samples
            alpha[np.ix_(valid_rows, valid_columns)] = np.where(
                samples == server.NODATA_VALUE, 0, 255
            ).astype(np.uint8)
        return values, alpha
    finally:
        dataset = None


def verify_sample_tile(base_url: str, dataset_name: str, zoom: int, x: int, y: int) -> dict:
    payload, elapsed_ms = get_tile(base_url, dataset_name, zoom, x, y)
    from io import BytesIO

    rgba = np.asarray(Image.open(BytesIO(payload)).convert("RGBA"))
    expected, expected_alpha = direct_reference(dataset_name, zoom, x, y)
    if not np.array_equal(rgba[:, :, 0], rgba[:, :, 1]) or not np.array_equal(rgba[:, :, 0], rgba[:, :, 2]):
        raise AssertionError(f"{dataset_name} rendered grayscale RGB channels differ.")
    if not np.array_equal(rgba[:, :, 0], expected):
        raise AssertionError(f"{dataset_name} tile pixel values differ from GDAL source samples.")
    if not np.array_equal(rgba[:, :, 3], expected_alpha):
        raise AssertionError(f"{dataset_name} tile alpha does not match GDAL NoData/source bounds.")

    valid = expected_alpha == 255
    transparent = expected_alpha == 0
    sample_points = [(32, 32), (64, 64), (128, 128), (192, 192), (224, 224)]
    samples = []
    for row, column in sample_points:
        if valid[row, column]:
            samples.append(
                {
                    "tilePixel": [column, row],
                    "sourceValue": int(expected[row, column]),
                }
            )
    return {
        "dataset": dataset_name,
        "tile": [zoom, x, y],
        "responseBytes": len(payload),
        "responseMs": round(elapsed_ms, 3),
        "pixelComparison": "all 65,536 pixels match nearest source samples and NoData mask",
        "validPixels": int(valid.sum()),
        "transparentPixels": int(transparent.sum()),
        "transparentPercent": round(float(transparent.mean() * 100), 3),
        "sampleValues": samples,
    }


def verify_nodata_tile(base_url: str, dataset_name: str) -> dict:
    zoom, x, y = 6, 1, 0
    result = verify_sample_tile(base_url, dataset_name, zoom, x, y)
    if result["validPixels"] == 0 or result["transparentPixels"] == 0:
        raise AssertionError(
            f"{dataset_name} NoData tile must contain both valid and transparent pixels."
        )
    return result


def benchmark(base_url: str) -> list[dict]:
    results = []
    for dataset_name in server.DATASETS:
        for zoom in (0, 3, 5, 6, 7):
            x, y = center_tile(zoom)
            payload, elapsed_ms = get_tile(base_url, dataset_name, zoom, x, y)
            _, repeat_ms = get_tile(base_url, dataset_name, zoom, x, y)
            results.append(
                {
                    "dataset": dataset_name,
                    "zxy": [zoom, x, y],
                    "bytes": len(payload),
                    "firstRequestMs": round(elapsed_ms, 3),
                    "cachedRepeatMs": round(repeat_ms, 3),
                }
            )
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8765")
    args = parser.parse_args()

    with urllib.request.urlopen(f"{args.url}/health", timeout=10) as response:
        health = json.load(response)
    print(json.dumps({"health": health}, indent=2))

    sample_tiles = [
        verify_sample_tile(args.url, "optical", 6, *center_tile(6)),
        verify_sample_tile(args.url, "hillshade", 7, *center_tile(7)),
    ]
    nodata_tiles = [
        verify_nodata_tile(args.url, "optical"),
        verify_nodata_tile(args.url, "hillshade"),
    ]
    print(json.dumps({"verifiedSampleTiles": sample_tiles}, indent=2))
    print(json.dumps({"verifiedNoDataTiles": nodata_tiles}, indent=2))

    measurements = benchmark(args.url)
    print(json.dumps({"timings": measurements}, indent=2))

    wrong_layer = f"{args.url}/tiles/unknown/0/0/0.png"
    try:
        urllib.request.urlopen(wrong_layer, timeout=10)
    except urllib.error.HTTPError as error:
        print(json.dumps({"invalidLayerStatus": error.code}))
        if error.code != 404:
            raise
    else:
        raise AssertionError("Unknown layer did not return HTTP 404.")


if __name__ == "__main__":
    main()
