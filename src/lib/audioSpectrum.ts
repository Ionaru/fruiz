/**
 * Pure helpers that turn an `AnalyserNode`'s raw frequency bins into per-bar
 * magnitudes for the {@link AudioVisualizer}.
 *
 * `getByteFrequencyData` returns linear frequency bins, but music energy is
 * bass-weighted and pitch perception is logarithmic, so mapping bins to bars
 * directly pins the low bars at full height and leaves the high ones flat. Two
 * steps fix that: log-spaced bands, and a per-bar treble tilt.
 *
 * Bin index is linear in frequency, so log-spacing the indices log-spaces the
 * frequencies and no sample rate is needed here.
 */

/** Lowest bin included in the lowest bar. Bin 0 (DC offset) is skipped. */
export const SPECTRUM_MIN_BIN = 1;
/**
 * Fraction of the available bins to span. The top ~quarter of the spectrum
 * (≈ 16 kHz and up) carries almost no musical energy, so dropping it keeps every
 * bar over a frequency range that actually moves.
 */
export const SPECTRUM_MAX_BIN_FRACTION = 0.75;
/**
 * Treble lift: the highest bar is multiplied by `1 + SPECTRUM_TILT`, the lowest
 * by `1`, interpolated between. Raise for livelier highs, lower toward 0 for a
 * faithful, bass-dominant display. Kept modest so the highs do not clamp.
 */
export const SPECTRUM_TILT = 1.0;

/**
 * Highest bin to include, given the analyser's bin count. The clamp to
 * `binCount - 1` wins over the {@link SPECTRUM_MIN_BIN} floor, so the result is
 * never an index past the analyser buffer (only reachable at tiny FFT sizes).
 */
export function resolveMaxBin(binCount: number): number {
  const fractioned = Math.floor(binCount * SPECTRUM_MAX_BIN_FRACTION);
  return Math.min(binCount - 1, Math.max(SPECTRUM_MIN_BIN + 1, fractioned));
}

/**
 * Log-spaced bin-index edges, length `barCount + 1`. Edge `index` and
 * `index + 1` bound the bins that feed bar `index`. `edges[0] === minBin` and
 * `edges[barCount] === maxBin`.
 */
export function computeLogBandEdges(
  barCount: number,
  minBin: number,
  maxBin: number,
): Float32Array {
  const edges = new Float32Array(barCount + 1);
  const logMin = Math.log(minBin);
  const logMax = Math.log(maxBin);
  for (let edgeIndex = 0; edgeIndex <= barCount; edgeIndex++) {
    const fraction = barCount === 0 ? 0 : edgeIndex / barCount;
    edges[edgeIndex] = Math.exp(logMin + (logMax - logMin) * fraction);
  }
  return edges;
}

/**
 * Per-bar multiplicative gain ramping from `1` (lowest bar) to `1 + tilt`
 * (highest bar). See {@link SPECTRUM_TILT}.
 */
export function computeTiltWeights(
  barCount: number,
  tilt: number,
): Float32Array {
  const weights = new Float32Array(barCount);
  for (let barIndex = 0; barIndex < barCount; barIndex++) {
    const fraction = barCount <= 1 ? 0 : barIndex / (barCount - 1);
    weights[barIndex] = 1 + tilt * fraction;
  }
  return weights;
}

/**
 * Fill `bars` (each `0..1`) from raw `0..255` FFT magnitudes. Each bar averages
 * the bins inside its log-spaced band, normalizes to `0..1`, applies its tilt
 * weight, and clamps to `1`. Allocation-free: all buffers are passed in and
 * reused across frames.
 *
 * @param bars Output, length defines the bar count; overwritten in place.
 * @param frequencyData Raw analyser bytes from `getByteFrequencyData`.
 * @param edges Band edges from {@link computeLogBandEdges} (length `bars + 1`).
 * @param tiltWeights Per-bar gains from {@link computeTiltWeights}.
 */
export function fillSpectrumBars(
  bars: Float32Array,
  frequencyData: ArrayLike<number>,
  edges: ArrayLike<number>,
  tiltWeights: ArrayLike<number>,
): void {
  const barCount = bars.length;
  for (let barIndex = 0; barIndex < barCount; barIndex++) {
    const bandStart = edges[barIndex] ?? 0;
    const bandEnd = edges[barIndex + 1] ?? bandStart;
    const lowBin = Math.floor(bandStart);
    // At least one bin per bar, even where adjacent log edges round together.
    const highBin = Math.max(lowBin + 1, Math.ceil(bandEnd));

    let sum = 0;
    let count = 0;
    for (let binIndex = lowBin; binIndex < highBin; binIndex++) {
      sum += frequencyData[binIndex] ?? 0;
      count++;
    }

    const average = count > 0 ? sum / count : 0;
    const weight = tiltWeights[barIndex] ?? 1;
    bars[barIndex] = Math.min(1, (average / 255) * weight);
  }
}
