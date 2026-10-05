import { rasterize, blue, type Level, type RasterSource } from '@wandas/gui-core';
const pressure: Level = { quantity: 'pressure', unit: 'dB SPL', axisLabel: 'SPL', referenceValue: 2e-5, referenceUnit: 'Pa' };
const source: RasterSource = { layout: 'flat', bins: 1, values: new Float32Array([-50]), level: pressure };
const pixels: Uint8ClampedArray = rasterize(source, { columns: [[0, 1]], rows: [[0, 1]] }, { min: -100, max: 0 }, blue).pixels;
void pixels;
// @ts-expect-error References carry a unit name, not a scalar.
const invalid: Level = { quantity: 'pressure', unit: 'dB SPL', axisLabel: 'SPL', referenceUnit: 1 };
void invalid;
