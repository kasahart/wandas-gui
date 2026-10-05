# Wandas GUI core

A small, framework-independent TypeScript rendering kernel shared by
[audio-wandas-analyzer](https://github.com/kasahart/audio-wandas-analyzer) and
[ASD Insight](https://github.com/kasahart/asd-insight).

It provides max pooling over selected spectrogram cells, RGBA raster generation,
palette interpolation and shared range/level types. Runtime dependencies: zero.
React, VS Code, Canvas, Python, DSP, workers and persistence stay in consumers.
The initial kernel is byte-identical to the merged Analyzer PR207 implementation;
see [NOTICE.md](NOTICE.md) for preserved source history and attribution.

## Build and test

Node 22 or 24:

```sh
npm ci
npm run verify
```

`verify` builds ESM/CommonJS JavaScript plus declarations, checks both TypeScript
entrypoints without DOM/framework types, and runs Node tests for pixels, units,
nonfinite inputs, endpoints, buffer reuse and provenance synchronization.
No browser window, audio output or recorded fixture is required. This repository
is public; the package remains `private: true` and is not published to a registry.

## Use a local build

After building, import `dist/esm/index.js`, or install that built checkout as a
local package and use its ESM/CommonJS exports:

```ts
import { rasterize, blue, type RasterSource } from '@wandas/gui-core';

const source: RasterSource = {
  layout: 'flat', values: new Float32Array([-100, -50]), bins: 2,
  level: { quantity: 'pressure amplitude', unit: 'dB SPL', axisLabel: 'SPL',
    referenceValue: 2e-5, referenceUnit: 'Pa' },
};
const image = rasterize(source, {
  columns: [[0, 1]], rows: [[0, 1], [1, 2]],
}, { min: -100, max: 0 }, blue);
// image.pixels is a Uint8ClampedArray; the consumer paints or transfers it.
```

Plans contain valid half-open source index intervals; `null` marks transparent
out-of-recording cells. Frequency rows run low to high and are written bottom to
top. Adapters validate dimensions and choose intervals using their own STFT axes,
frame centers, reduction intervals and display policies. A reusable destination
must have exactly `columns.length * rows.length * 4` bytes and is cleared first.

Level metadata is retained without unit conversion: calibrated SPL, acceleration
and dBFS are distinct. The kernel does not convert one quantity/reference into
another. Finite pooling skips nonfinite samples; `peakMode: 'comparison'` retains
Analyzer's legacy comparison behavior. `floor` excludes values at/below the
specified floor. Constant ranges use the lower color; nonfinite normalized limits
retain legacy opaque-black behavior. `blue` rounds channels; `viridis` floors them.
Physical-axis corrections and cursor/track behavior remain separate product work.

## Commit-pinned consumers

Until a package distribution is requested, consumers may check in the tiny source
snapshot plus LICENSE/NOTICE. The shared tool itself is pinned with the source:

```sh
# Inside a consumer checkout; use a clean, committed wandas-gui checkout.
node scripts/sync-gui-core.mjs --from /path/to/wandas-gui --into packages/wandas-gui-core
node scripts/sync-gui-core.mjs --check packages/wandas-gui-core
```

Analyzer uses `src/shared/gui-core` as its destination. On initial adoption, copy
`scripts/sync-gui-core.mjs` from this repository into the consumer's scripts folder.
Sync validates the canonical origin/root, reads committed Git blobs, copies
`src/index.ts`, LICENSE/NOTICE and the tool, and records the exact commit/SHA256s.
Checks are offline and detect edits to source, attribution or the copied tool.
Mark snapshot files and the copied tool `-text` in consumer `.gitattributes` to
preserve byte-exact hashes across line-ending filters. Consumer-local package
manifests and product adapters are not part of the vendored source.

Update the kernel/tool here, then explicitly re-sync and test both consumers.
No automatic upstream polling, registry publishing, deployment or product merge
is performed by the tool.

## License

[MIT](LICENSE.md), with original copyright and attribution retained in
[NOTICE.md](NOTICE.md).
