import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { rasterize, normalizedColor, blue, viridis } from '@wandas/gui-core';
const require = createRequire(import.meta.url);
const plan = { columns: [[0, 1], [1, 2]], rows: [[0, 1], [1, 2]] };
const limits = { min: -100, max: 0 };

test('flat and rows layouts pool the same cells with high frequencies at the top', () => {
  const rows = [[-100, 0], [-50, -75]];
  const a = rasterize({ layout: 'rows', values: rows, bins: 2 }, plan, limits, blue);
  const b = rasterize({ layout: 'flat', values: rows.flat(), bins: 2 }, plan, limits, blue);
  assert.deepEqual(a, b);
  assert.deepEqual([...a.pixels], [238, 248, 255, 255, 18, 54, 95, 255, 11, 20, 40, 255, 36, 111, 159, 255]);
});
test('half-open intervals retain the strongest intersecting source bin', () => {
  const result = rasterize({ layout: 'flat', values: [-100, -75, -25, -50], bins: 2 }, { columns: [[0, 2]], rows: [[0, 2]] }, limits, blue);
  assert.deepEqual([...result.pixels], [110, 180, 212, 255]);
});
test('outside cells stay transparent and reused destinations are cleared', () => {
  const buffer = new Uint8ClampedArray(16).fill(255);
  const p = { columns: [null, [0, 1]], rows: [[0, 1], null] };
  const result = rasterize({ layout: 'rows', values: [[0]], bins: 1 }, p, limits, blue, buffer);
  assert.equal(result.pixels, buffer);
  assert.deepEqual([...buffer], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 238, 248, 255, 255]);
});
test('finite and legacy comparison modes keep their distinct Infinity behavior', () => {
  const source = { layout: 'flat', values: [NaN, Infinity, -25, -Infinity], bins: 4 };
  const p = { columns: [[0, 1]], rows: [[0, 4]] };
  assert.deepEqual([...rasterize(source, p, limits, blue).pixels], [110, 180, 212, 255]);
  assert.deepEqual([...rasterize(source, { ...p, peakMode: 'comparison' }, limits, blue).pixels], [11, 20, 40, 255]);
});
test('floor and missing samples use the lower display color', () => {
  for (const values of [[], [-240, -300, NaN]]) {
    const image = rasterize({ layout: 'flat', values, bins: 3, floor: -240 }, { columns: [[0, 1]], rows: [[0, 3]] }, limits, blue);
    assert.deepEqual([...image.pixels], [11, 20, 40, 255]);
  }
});
test('constant and nonfinite limits preserve legacy drawing semantics', () => {
  const source = { layout: 'rows', values: [[-50]], bins: 1 };
  const p = { columns: [[0, 1]], rows: [[0, 1]] };
  assert.deepEqual([...rasterize(source, p, { min: -50, max: -50 }, viridis).pixels], [68, 1, 84, 255]);
  assert.deepEqual([...rasterize(source, p, { min: -Infinity, max: 0 }, viridis).pixels], [0, 0, 0, 255]);
});
test('calibrated quantity, unit and reference metadata is preserved without conversion', () => {
  for (const level of [
    { quantity: 'pressure amplitude', unit: 'dB SPL', axisLabel: 'SPL', referenceValue: 2e-5, referenceUnit: 'Pa' },
    { quantity: 'acceleration amplitude', unit: 'dB', axisLabel: 'Acceleration', referenceValue: 1, referenceUnit: 'm/s²' },
    { quantity: 'peak amplitude', unit: 'dBFS', axisLabel: 'dBFS', referenceValue: 1, referenceUnit: 'FS' },
  ]) {
    const source = { layout: 'flat', values: [-50], bins: 1, level };
    const original = structuredClone(source);
    rasterize(source, { columns: [[0, 1]], rows: [[0, 1]] }, limits, blue);
    assert.deepEqual(source, original);
  }
});
test('palette rounding and normalized endpoints are stable', () => {
  assert.deepEqual(normalizedColor(0, viridis), [68, 1, 84]);
  assert.deepEqual(normalizedColor(1, blue), [238, 248, 255]);
  assert.deepEqual(normalizedColor(-1, blue), normalizedColor(0, blue));
  assert.deepEqual(normalizedColor(NaN, blue), normalizedColor(0, blue));
  assert.deepEqual(normalizedColor(2, blue), normalizedColor(1, blue));
  assert.deepEqual(normalizedColor(0.125, blue), [15, 37, 68]);
  assert.deepEqual(normalizedColor(0.125, viridis), [63, 41, 111]);
});
test('empty shapes and invalid destinations are explicit', () => {
  const source = { layout: 'flat', values: [], bins: 0 };
  assert.equal(rasterize(source, { columns: [], rows: [] }, limits, blue).pixels.length, 0);
  assert.throws(() => rasterize(source, plan, limits, blue, new Uint8ClampedArray(1)), /destination shape/);
  assert.throws(() => rasterize(source, plan, limits, { stops: [], rounding: 'round' }), /Palette/);
});
test('ESM and CommonJS package entrypoints expose identical behavior', () => {
  const cjs = require('@wandas/gui-core');
  const source = { layout: 'flat', values: [-100, 0, -50, -75], bins: 2 };
  assert.deepEqual(cjs.rasterize(source, plan, limits, cjs.blue), rasterize(source, plan, limits, blue));
  assert.deepEqual(Object.keys(cjs).sort(), ['blue', 'normalizedColor', 'rasterize', 'viridis']);
});
