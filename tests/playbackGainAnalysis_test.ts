import {
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
