import {
  buildLoudnormArgs,
  decideGainRecompute,
  fingerprintFromFileInfo,
  hasCompleteStoredFingerprint,
  storedFingerprintMatchesFile,
} from "../src/lib/playbackGainAnalysis.ts";
import { assertEquals } from "@std/assert";

Deno.test("fingerprintFromFileInfo returns null when mtime is null", () => {
  const info = {
    isFile: true,
    isDirectory: false,
    isSymlink: false,
    size: 42,
    mtime: null,
    atime: null,
    birthtime: null,
    dev: 0,
    ino: null,
    mode: 0,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: null,
    blksize: 0,
    blocks: 0,
    isBlockDevice: false,
    isCharDevice: false,
    isFifo: false,
    isSocket: false,
  } as Deno.FileInfo;
  assertEquals(fingerprintFromFileInfo(info), null);
});

Deno.test("fingerprintFromFileInfo returns size and mtimeMs when mtime is set", () => {
  const mtime = new Date("2024-01-15T12:00:00.000Z");
  const info = {
    isFile: true,
    isDirectory: false,
    isSymlink: false,
    size: 100,
    mtime,
    atime: null,
    birthtime: null,
    dev: 0,
    ino: null,
    mode: 0,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: null,
    blksize: 0,
    blocks: 0,
    isBlockDevice: false,
    isCharDevice: false,
    isFifo: false,
    isSocket: false,
  } as Deno.FileInfo;
  assertEquals(fingerprintFromFileInfo(info), {
    size: 100,
    mtimeMs: mtime.getTime(),
  });
});

Deno.test("storedFingerprintMatchesFile requires both columns to match file", () => {
  const file = { size: 10, mtimeMs: 20 };
  assertEquals(storedFingerprintMatchesFile(10, 20, file), true);
  assertEquals(storedFingerprintMatchesFile(9, 20, file), false);
  assertEquals(storedFingerprintMatchesFile(10, 19, file), false);
  assertEquals(storedFingerprintMatchesFile(null, 20, file), false);
  assertEquals(storedFingerprintMatchesFile(10, null, file), false);
});

Deno.test("hasCompleteStoredFingerprint is true only when both are non-null", () => {
  assertEquals(hasCompleteStoredFingerprint(null, null), false);
  assertEquals(hasCompleteStoredFingerprint(1, null), false);
  assertEquals(hasCompleteStoredFingerprint(null, 2), false);
  assertEquals(hasCompleteStoredFingerprint(1, 2), true);
});

Deno.test("buildLoudnormArgs omits seeking when no window is given", () => {
  const args = buildLoudnormArgs("/music/song.mp3");
  assertEquals(args.includes("-ss"), false);
  assertEquals(args.includes("-t"), false);
  // Input path follows -i.
  assertEquals(args[args.indexOf("-i") + 1], "/music/song.mp3");
});

Deno.test("buildLoudnormArgs adds -ss and -t for a clip window before -i", () => {
  const args = buildLoudnormArgs("/music/song.mp3", {
    startSeconds: 12.5,
    maxSeconds: 30,
  });
  const ssIdx = args.indexOf("-ss");
  const tIdx = args.indexOf("-t");
  const iIdx = args.indexOf("-i");
  assertEquals(args[ssIdx + 1], "12.5");
  assertEquals(args[tIdx + 1], "30");
  // Input seeking: -ss/-t must precede -i.
  assertEquals(ssIdx < iIdx, true);
  assertEquals(tIdx < iIdx, true);
});

Deno.test("buildLoudnormArgs skips -ss when start is 0 but keeps -t", () => {
  const args = buildLoudnormArgs("/music/song.mp3", {
    startSeconds: 0,
    maxSeconds: 30,
  });
  assertEquals(args.includes("-ss"), false);
  assertEquals(args[args.indexOf("-t") + 1], "30");
});

Deno.test("decideGainRecompute: fresh row with both gains and matching window is a no-op", () => {
  assertEquals(
    decideGainRecompute({
      force: false,
      fullGainDb: -3,
      clipGainDb: -1,
      fingerprintStale: false,
      boundsChanged: false,
    }),
    { needFull: false, needClip: false },
  );
});

Deno.test("decideGainRecompute: a window shift recomputes clip only", () => {
  assertEquals(
    decideGainRecompute({
      force: false,
      fullGainDb: -3,
      clipGainDb: -1,
      fingerprintStale: false,
      boundsChanged: true,
    }),
    { needFull: false, needClip: true },
  );
});

Deno.test("decideGainRecompute: a changed file recomputes both", () => {
  assertEquals(
    decideGainRecompute({
      force: false,
      fullGainDb: -3,
      clipGainDb: -1,
      fingerprintStale: true,
      boundsChanged: false,
    }),
    { needFull: true, needClip: true },
  );
});

Deno.test("decideGainRecompute: legacy row missing clip gain recomputes clip only", () => {
  assertEquals(
    decideGainRecompute({
      force: false,
      fullGainDb: -3,
      clipGainDb: null,
      fingerprintStale: false,
      boundsChanged: false,
    }),
    { needFull: false, needClip: true },
  );
});

Deno.test("decideGainRecompute: force recomputes both", () => {
  assertEquals(
    decideGainRecompute({
      force: true,
      fullGainDb: -3,
      clipGainDb: -1,
      fingerprintStale: false,
      boundsChanged: false,
    }),
    { needFull: true, needClip: true },
  );
});
