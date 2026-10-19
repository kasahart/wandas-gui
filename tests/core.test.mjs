import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { rasterize, normalizedColor, blue, viridis, magma, stackFrames, fittedAxisTitle, drawValueAxis, drawCrosshair, readoutText } from '@wandas/gui-core';
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
test('magma endpoints and midpoint retain the Matplotlib five-stop palette', () => {
  assert.deepEqual(normalizedColor(0, magma), [0, 0, 4]);
  assert.deepEqual(normalizedColor(0.5, magma), [183, 55, 121]);
  assert.deepEqual(normalizedColor(1, magma), [252, 253, 191]);
  assert.deepEqual(normalizedColor(0.25, magma), [81, 18, 124]);
  assert.deepEqual(normalizedColor(0.75, magma), [252, 137, 97]);
  assert.deepEqual(normalizedColor(0.125, magma), [40, 9, 64]);
});
test('magma raster pixels use the same colors as normalizedColor', () => {
  const source = { layout: 'flat', values: [-100, -50, 0], bins: 1 };
  const result = rasterize(source, { columns: [[0, 1], [1, 2], [2, 3]], rows: [[0, 1]] }, limits, magma);
  assert.deepEqual([...result.pixels], [0, 0, 4, 255, 183, 55, 121, 255, 252, 253, 191, 255]);
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
  assert.deepEqual(cjs.normalizedColor(0.5, cjs.magma), normalizedColor(0.5, magma));
  assert.deepEqual(Object.keys(cjs).sort(), ['PLOT_FONT', 'blue', 'drawCrosshair', 'drawValueAxis', 'fittedAxisTitle', 'magma', 'normalizedColor', 'rasterize', 'readoutText', 'stackFrames', 'viridis']);
});

function recorder() {
  const calls = [];
  const ctx = { fillStyle: '', strokeStyle: '', font: '', lineWidth: 0, textAlign: 'left', textBaseline: 'top', measureText: text => ({ width: text.length * 5 }) };
  for (const name of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'setLineDash'])
    ctx[name] = (...args) => calls.push([name, ...args]);
  ctx.fillText = (text, x, y) => calls.push(['fillText', text, x, y, ctx.textAlign, ctx.textBaseline, ctx.fillStyle]);
  return { ctx, calls };
}
test('stacked frames share the height left after the gaps', () => {
  assert.deepEqual(stackFrames({ left: 40, top: 8, width: 100, height: 92 }, 3, 4), [
    { left: 40, top: 8, width: 100, height: 28 }, { left: 40, top: 40, width: 100, height: 28 }, { left: 40, top: 72, width: 100, height: 28 },
  ]);
  assert.deepEqual(stackFrames({ left: 0, top: 0, width: 10, height: 10 }, 1, 4), [{ left: 0, top: 0, width: 10, height: 10 }]);
  assert.deepEqual(stackFrames({ left: 0, top: 0, width: 10, height: 10 }, 0, 4), []);
  assert.deepEqual(stackFrames({ left: 0, top: 0, width: 10, height: 4 }, 3, 4).map(frame => [frame.top, frame.height]), [[0, 0], [2, 0], [4, 0]]);
});
test('an axis title that does not fit falls back to its bracketed unit', () => {
  const measure = text => text.length * 5;
  assert.equal(fittedAxisTitle('Phase [°]', 60, measure), 'Phase [°]');
  assert.equal(fittedAxisTitle('Phase [°]', 30, measure), '°');
  assert.equal(fittedAxisTitle('Spectrum amplitude level [dB SPL]', 60, measure), 'dB SPL');
  // A title with no bracketed unit has nothing shorter to fall back to.
  assert.equal(fittedAxisTitle('γ²', 5, measure), 'γ²');
});
test('value axes right-align ticks against the frame and turn the title along the gutter', () => {
  const { ctx, calls } = recorder();
  drawValueAxis(ctx, { left: 48, top: 10, width: 100, height: 80 }, [{ text: '0', fraction: 1 }, { text: '-30', fraction: 0.5 }, { text: '-60', fraction: 0 }], 'Gain [dB]', { color: '#888', titleX: 7 });
  assert.deepEqual(calls.filter(call => call[0] === 'fillText'), [
    ['fillText', '0', 46, 10, 'right', 'top', '#888'],
    ['fillText', '-30', 46, 50, 'right', 'middle', '#888'],
    ['fillText', '-60', 46, 90, 'right', 'bottom', '#888'],
    ['fillText', 'Gain [dB]', 0, 0, 'center', 'middle', '#888'],
  ]);
  assert.deepEqual(calls.filter(call => call[0] === 'translate' || call[0] === 'rotate'), [['translate', 7, 50], ['rotate', -Math.PI / 2]]);
  assert.equal(calls[0][0], 'save');
  assert.equal(calls.at(-1)[0], 'restore');
});
test('an empty title draws only the ticks, in the font given', () => {
  const { ctx, calls } = recorder();
  drawValueAxis(ctx, { left: 48, top: 0, width: 100, height: 80 }, [{ text: '1', fraction: 1 }], '', { color: '#888', titleX: 7, font: '10px serif' });
  assert.deepEqual(calls.filter(call => call[0] === 'fillText').map(call => call[1]), ['1']);
  assert.ok(!calls.some(call => call[0] === 'rotate'));
  assert.equal(ctx.font, '10px serif');
});
test('the crosshair draws a horizontal line only with a value', () => {
  const frame = { left: 40, top: 8, width: 100, height: 50 };
  const lines = y => {
    const { ctx, calls } = recorder();
    drawCrosshair(ctx, frame, 70, y, 'white', 'red');
    return calls.filter(call => call[0] === 'moveTo' || call[0] === 'lineTo');
  };
  assert.deepEqual(lines(null), [['moveTo', 70, 8], ['lineTo', 70, 58]]);
  assert.deepEqual(lines(20), [['moveTo', 70, 8], ['lineTo', 70, 58], ['moveTo', 40, 20], ['lineTo', 140, 20]]);
});
test('readouts join their parts in one order', () => {
  assert.equal(readoutText(['ch1', '1.20 kHz', '-3.2 dB', '45°', 'γ² 0.98']), 'ch1 / 1.20 kHz / -3.2 dB / 45° / γ² 0.98');
});
