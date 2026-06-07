/**
 * Pure validator for the guess-telemetry request body. The island POSTs
 * `{ matched: boolean }` — the scoring result of a submitted guess (it already
 * gated on the suggestion pool client-side). Only the low-cardinality `matched`
 * flag is recorded; no answer text or track id ever crosses the wire.
 */
export function parseGuessBody(raw: unknown): { matched: boolean } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const matched = (raw as Record<string, unknown>).matched;
  if (typeof matched !== "boolean") return null;
  return { matched };
}
