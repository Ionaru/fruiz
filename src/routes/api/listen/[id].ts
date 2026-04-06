import { join } from "node:path";

import { contentTypeForAudioPath } from "../../../lib/audioExtensions.ts";
import { db } from "../../../db/db.ts";
import { define } from "../../../utils.ts";

const RANGE_CHUNK_BYTES = 64 * 1024;

function rangeReadableStreamFromPosition(
  file: Deno.FsFile,
  length: number,
): ReadableStream<Uint8Array> {
  let remaining = length;
  let closed = false;
  const safeClose = () => {
    if (closed) return;
    closed = true;
    try {
      file.close();
    } catch {
      // ignore double-close
    }
  };

  return new ReadableStream({
    async pull(controller) {
      if (remaining <= 0) {
        safeClose();
        controller.close();
        return;
      }
      const size = Math.min(remaining, RANGE_CHUNK_BYTES);
      const buf = new Uint8Array(size);
      const n = await file.read(buf);
      if (n === null || n === 0) {
        safeClose();
        controller.close();
        return;
      }
      remaining -= n;
      controller.enqueue(n === buf.byteLength ? buf : buf.subarray(0, n));
      if (remaining <= 0) {
        safeClose();
        controller.close();
      }
    },
    cancel() {
      safeClose();
    },
  });
}

function resolveAudioFilePath(audioUrl: string): string {
  const s = audioUrl.trim();
  if (/^https?:\/\//i.test(s)) {
    throw new Deno.errors.NotFound();
  }
  const rel = s.replace(/^\/+/, "");
  if (!rel || rel.split(/[/\\]/).includes("..")) {
    throw new Deno.errors.NotFound();
  }
  return join(Deno.cwd(), ...rel.split("/"));
}

async function getAudioPathForTrack(id: string): Promise<string | undefined> {
  const row = await db.query.tracks.findFirst({
    where: { id },
    columns: { audioUrl: true },
  });
  if (!row) return undefined;
  try {
    return resolveAudioFilePath(row.audioUrl);
  } catch {
    return undefined;
  }
}

function parseRange(
  range: string | null,
  fileSize: number,
): { start: number; end: number } | null {
  if (!range?.startsWith("bytes=")) return null;
  const part = range.slice("bytes=".length).split(",")[0]?.trim();
  if (!part) return null;

  const [rawStart, rawEnd] = part.split("-", 2);
  let start: number;
  let end: number;

  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, fileSize - suffix);
    end = fileSize - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? fileSize - 1 : Number(rawEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  }

  if (start > end || start >= fileSize) return null;
  end = Math.min(end, fileSize - 1);
  return { start, end };
}

export const handler = define.handlers({
  async GET(ctx) {
    let file: Deno.FsFile | undefined;
    let resolvedPath: string | undefined;
    try {
      resolvedPath = await getAudioPathForTrack(ctx.params.id);
      if (!resolvedPath) {
        return new Response("Not found", { status: 404 });
      }
      file = await Deno.open(resolvedPath, { read: true });
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return new Response("Not found", { status: 404 });
      }
      throw e;
    }

    try {
      const fileSize = (await file.stat()).size;
      const range = parseRange(ctx.req.headers.get("range"), fileSize);

      const contentType = contentTypeForAudioPath(resolvedPath);
      const base = new Headers({
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });

      if (!range) {
        const readable = file.readable;
        file = undefined;
        base.set("Content-Length", String(fileSize));
        return new Response(readable, { status: 200, headers: base });
      }

      const { start, end } = range;
      const length = end - start + 1;
      await file.seek(start, Deno.SeekMode.Start);
      const stream = rangeReadableStreamFromPosition(file, length);
      file = undefined;

      base.set("Content-Length", String(length));
      base.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);

      return new Response(stream, { status: 206, headers: base });
    } finally {
      file?.close();
    }
  },
});
