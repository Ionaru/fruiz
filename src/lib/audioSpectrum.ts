/**
 * Pure helpers that turn an `AnalyserNode`'s raw frequency bins into per-bar
 * magnitudes for the {@link AudioVisualizer}.
 *
 * Why this exists: `getByteFrequencyData` returns *linear* frequency bins (each
 * bin spans the same number of Hz). Music energy is heavily bass-weighted and
 * pitch perception is logarithmic, so a direct bin → bar mapping leaves the low
 * bars pinned at full height and the high bars almost flat regardless of the
 * track. These helpers fix that with two steps:
 *
 *  1. **Log-spaced bands** — bars are spread across log-spaced bin ranges (≈ one
 *     constant pitch ratio per bar, like octaves on a piano) instead of equal Hz
 *     slices, so the bass no longer dominates most of the bars.
 *  2. **Treble tilt** — a per-bar gain that ramps up toward the high end to
 *     counter music's natural bass-heavy spectral tilt, so the high bars visibly
 *     react.
 *
 * Bin index is linear in frequency (`freq = binIndex * sampleRate / fftSize`),
 * so log-spacing the bin indices is equivalent to log-spacing the frequencies —
 * no sample rate needed here.
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
 * Treble lift. The highest bar's magnitude is multiplied by `1 + SPECTRUM_TILT`
 * and the lowest by `1` (linearly interpolated between). Raise for livelier
 * highs, lower toward 0 for a faithful, bass-dominant display. Kept modest so
 * the lifted highs do not clamp to full height.
 */
export const SPECTRUM_TILT = 1.0;

/**
 * Highest bin to include, given the analyser's bin count. Kept above
 * {@link SPECTRUM_MIN_BIN} where possible, but the final clamp to `binCount - 1`
 * wins so the result is never a bin index past the analyser buffer (matters only
 * for tiny FFT sizes; production uses 512 bins → 384).
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
