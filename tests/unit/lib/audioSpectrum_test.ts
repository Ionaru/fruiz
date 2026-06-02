import { assert, assertAlmostEquals, assertEquals } from "@std/assert";

import {
  computeLogBandEdges,
  computeTiltWeights,
  fillSpectrumBars,
  resolveMaxBin,
  SPECTRUM_MIN_BIN,
} from "../../../src/lib/audioSpectrum.ts";

Deno.test("resolveMaxBin drops the dead top end but stays above the min bin", () => {
  assertEquals(resolveMaxBin(512), Math.floor(512 * 0.75));
  // Tiny FFT: still leaves a usable range above SPECTRUM_MIN_BIN.
  assert(resolveMaxBin(4) > SPECTRUM_MIN_BIN);
  assert(resolveMaxBin(512) < 512);
});

Deno.test("resolveMaxBin never returns a bin index past the buffer", () => {
  // Exercises the final clamp at the tiny sizes where the fraction floor and
  // the SPECTRUM_MIN_BIN + 1 floor would otherwise overrun binCount - 1.
  for (const binCount of [2, 3, 4, 16, 64, 512]) {
    const maxBin = resolveMaxBin(binCount);
    assert(
      maxBin <= binCount - 1,
      `maxBin ${maxBin} must stay within binCount ${binCount}`,
    );
    assert(
      maxBin >= SPECTRUM_MIN_BIN,
      "maxBin must not fall below the min bin",
    );
  }
});

Deno.test("computeLogBandEdges spans [minBin, maxBin] monotonically", () => {
  const edges = computeLogBandEdges(24, 1, 384);
  assertEquals(edges.length, 25);
  assertAlmostEquals(edges[0] ?? 0, 1);
  assertAlmostEquals(edges[24] ?? 0, 384);
  for (let index = 1; index < edges.length; index++) {
    assert((edges[index] ?? 0) > (edges[index - 1] ?? 0), "edges increase");
  }
});

Deno.test("computeLogBandEdges spacing is a constant ratio (log-spaced)", () => {
  const edges = computeLogBandEdges(12, 2, 2048);
  const firstRatio = (edges[1] ?? 0) / (edges[0] ?? 1);
  for (let index = 2; index < edges.length; index++) {
    const ratio = (edges[index] ?? 0) / (edges[index - 1] ?? 1);
    assertAlmostEquals(ratio, firstRatio, 1e-6, "equal pitch ratio per band");
  }
});

Deno.test("computeTiltWeights ramps from 1 to 1 + tilt", () => {
  const weights = computeTiltWeights(5, 1.5);
  assertAlmostEquals(weights[0] ?? 0, 1);
  assertAlmostEquals(weights[4] ?? 0, 2.5);
  for (let index = 1; index < weights.length; index++) {
    assert((weights[index] ?? 0) > (weights[index - 1] ?? 0), "weights rise");
  }
});

Deno.test("computeTiltWeights handles the single-bar edge case", () => {
  const weights = computeTiltWeights(1, 1.5);
  assertEquals(weights.length, 1);
  assertAlmostEquals(weights[0] ?? 0, 1);
});

Deno.test("fillSpectrumBars maps silence to all-zero bars", () => {
  const bars = new Float32Array(8);
  const frequencyData = new Uint8Array(64); // all zero
  const edges = computeLogBandEdges(8, 1, 32);
  const weights = computeTiltWeights(8, 1.5);

  fillSpectrumBars(bars, frequencyData, edges, weights);

  for (const value of bars) assertEquals(value, 0);
});

Deno.test("fillSpectrumBars clamps a full-scale spectrum to 1", () => {
  const bars = new Float32Array(8);
  const frequencyData = new Uint8Array(64).fill(255);
  const edges = computeLogBandEdges(8, 1, 32);
  const weights = computeTiltWeights(8, 1.5);

  fillSpectrumBars(bars, frequencyData, edges, weights);

  // 255/255 = 1, every tilt weight >= 1, so every bar clamps to 1.
  for (const value of bars) assertEquals(value, 1);
});

Deno.test("fillSpectrumBars isolates the clamp: tilt-boosted bars cap at 1, others don't", () => {
  const bars = new Float32Array(8);
  // 200/255 ≈ 0.784, below 1 on its own. The tilt weight is what pushes the
  // high bars over 1, so this case fails if the Math.min clamp is removed.
  const frequencyData = new Uint8Array(64).fill(200);
  const edges = computeLogBandEdges(8, 1, 32);
  const weights = computeTiltWeights(8, 1.5); // weights span 1 .. 2.5

  fillSpectrumBars(bars, frequencyData, edges, weights);

  assert((bars[0] ?? 0) < 1, "lowest bar (weight 1) is left unclamped below 1");
  assertEquals(bars[7], 1, "highest bar (weight 2.5) is clamped down to 1");
});

Deno.test("fillSpectrumBars keeps low-frequency-only energy in the low bars", () => {
  const bars = new Float32Array(8);
  const frequencyData = new Uint8Array(64);
  // Energy only in the lowest few bins.
  frequencyData[1] = 200;
  frequencyData[2] = 200;
  const edges = computeLogBandEdges(8, 1, 32);
  const weights = computeTiltWeights(8, 1.5);

  fillSpectrumBars(bars, frequencyData, edges, weights);

  assert((bars[0] ?? 0) > 0, "lowest bar reacts");
  // Energy is concentrated low: the lowest bar must outweigh the upper half.
  assert((bars[0] ?? 0) > (bars[5] ?? 0), "low bar exceeds an upper bar");
  assertEquals(bars[7], 0, "highest bar stays flat for bass-only input");
});

Deno.test("fillSpectrumBars tilt lifts the high bars on a flat spectrum", () => {
  const bars = new Float32Array(8);
  // Flat, moderate energy across the whole spectrum.
  const frequencyData = new Uint8Array(64).fill(80);
  const edges = computeLogBandEdges(8, 1, 32);
  const weights = computeTiltWeights(8, 1.5);

  fillSpectrumBars(bars, frequencyData, edges, weights);

  // With a flat input, the tilt alone makes high bars taller than low bars.
  assert(
    (bars[7] ?? 0) > (bars[0] ?? 0),
    "tilt makes the top bar exceed the bottom bar on flat input",
  );
});
