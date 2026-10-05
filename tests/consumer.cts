import core = require('@wandas/gui-core');
const source: core.RasterSource = { layout: 'rows', values: [[-50]], bins: 1 };
const pixels: Uint8ClampedArray = core.rasterize(source, { columns: [[0, 1]], rows: [[0, 1]] }, { min: -100, max: 0 }, core.blue).pixels;
void pixels;
