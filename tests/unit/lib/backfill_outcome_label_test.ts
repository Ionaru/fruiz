import { assertEquals } from "@std/assert";
import {
  type AnalyzePlaybackGainOutcome,
  backfillOutcomeLabel,
} from "../../../src/lib/playbackGainAnalysis.ts";

// Maps the 6 code outcomes onto spec 12's exactly-5 attribute values.
Deno.test("backfillOutcomeLabel maps every outcome to a spec value", () => {
  const cases: Array<[AnalyzePlaybackGainOutcome, string]> = [
    ["cache_hit", "cache-hit"],
    ["measured", "measured"],
    ["seeded_fingerprint", "seeded"],
    ["ffmpeg_failed", "analysis-failed"],
    ["invalid_audio_url", "missing-or-invalid"],
    ["file_not_found", "missing-or-invalid"],
  ];
  for (const [outcome, label] of cases) {
    assertEquals(backfillOutcomeLabel(outcome), label);
  }
});
