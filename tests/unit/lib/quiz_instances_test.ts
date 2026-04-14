import { assertEquals } from "@std/assert";

import { DEFAULT_MAX_PLAY_SECONDS } from "../../../src/lib/quizPlayback.ts";
import { toSnapshotQuizPayload } from "../../../src/lib/quizInstances.ts";

Deno.test("snapshot payload remains stable when extra tracks exist", () => {
  const snapshotRows = [
    {
      trackId: "track-1",
      trackTitleSnapshot: "Track One",
      title: "Track One",
      audioUrl: "audio/one.mp3",
      difficulty: "easy" as const,
      playbackGainDb: null as number | null,
      playStartSeconds: null as number | null,
      maxPlaySeconds: null as number | null,
    },
    {
      trackId: "track-2",
      trackTitleSnapshot: "Track Two",
      title: "Track Two",
      audioUrl: "audio/two.mp3",
      difficulty: "hard" as const,
      playbackGainDb: null as number | null,
      playStartSeconds: null as number | null,
      maxPlaySeconds: null as number | null,
    },
  ];

  const payloadA = toSnapshotQuizPayload(snapshotRows);
  const payloadB = toSnapshotQuizPayload([
    ...snapshotRows,
    {
      trackId: "track-extra",
      trackTitleSnapshot: "Extra Track",
      title: "Extra Track",
      audioUrl: "audio/extra.mp3",
      difficulty: "easy" as const,
      playbackGainDb: null as number | null,
      playStartSeconds: null as number | null,
      maxPlaySeconds: null as number | null,
    },
  ].slice(0, 2));

  assertEquals(payloadA, payloadB);
});

Deno.test("snapshot payload marks missing track as unavailable", () => {
  const payload = toSnapshotQuizPayload([
    {
      trackId: "track-missing",
      trackTitleSnapshot: "Missing Theme",
      title: null,
      audioUrl: null,
      difficulty: null,
      playbackGainDb: null,
      playStartSeconds: null,
      maxPlaySeconds: null,
    },
  ]);

  assertEquals(payload, [{
    id: "track-missing",
    title: "Missing Theme (Unavailable)",
    audioUrl: null,
    difficulty: "easy",
    unavailable: true,
    playbackGainDb: null,
    playStartSeconds: 0,
    maxPlaySeconds: DEFAULT_MAX_PLAY_SECONDS,
  }]);
});
