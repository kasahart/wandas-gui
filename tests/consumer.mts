import { rasterize, blue, drawCrosshair, drawValueAxis, stackFrames, type Level, type PlotContext, type RasterSource } from '@wandas/gui-core';
const pressure: Level = { quantity: 'pressure', unit: 'dB SPL', axisLabel: 'SPL', referenceValue: 2e-5, referenceUnit: 'Pa' };
const source: RasterSource = { layout: 'flat', bins: 1, values: new Float32Array([-50]), level: pressure };
const pixels: Uint8ClampedArray = rasterize(source, { columns: [[0, 1]], rows: [[0, 1]] }, { min: -100, max: 0 }, blue).pixels;
void pixels;
// @ts-expect-error References carry a unit name, not a scalar.
const invalid: Level = { quantity: 'pressure', unit: 'dB SPL', axisLabel: 'SPL', referenceUnit: 1 };
void invalid;
declare const plotContext: PlotContext;
const [lane] = stackFrames({ left: 40, top: 8, width: 100, height: 60 }, 3, 4);
drawValueAxis(plotContext, lane, [{ text: '0', fraction: 1 }], 'Gain [dB]', { color: '#888', titleX: 7 });
drawCrosshair(plotContext, lane, 50, null, '#fff', '#fff');
// @ts-expect-error The turned title needs its x.
drawValueAxis(plotContext, lane, [], 'dB', { color: '#888' });
