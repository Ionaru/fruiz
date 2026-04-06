import { assertEquals } from "@std/assert";

import { toSnapshotQuizPayload } from "../../../src/lib/quizInstances.ts";

Deno.test("snapshot payload remains stable when extra tracks exist", () => {
  const snapshotRows = [
    {
      trackId: "track-1",
      trackTitleSnapshot: "Track One",
      title: "Track One",
      audioUrl: "audio/one.mp3",
      difficulty: "easy" as const,
    },
    {
      trackId: "track-2",
      trackTitleSnapshot: "Track Two",
      title: "Track Two",
      audioUrl: "audio/two.mp3",
      difficulty: "hard" as const,
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
    },
  ]);

  assertEquals(payload, [{
    id: "track-missing",
    title: "Missing Theme (Unavailable)",
    audioUrl: null,
    difficulty: "easy",
    unavailable: true,
  }]);
});
