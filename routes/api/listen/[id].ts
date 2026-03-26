import { join } from "node:path";

import { eq } from "drizzle-orm";

import { db } from "../../../db/db.ts";
import { tracks } from "../../../db/schema.ts";
import { define } from "../../../utils.ts";

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
  const [row] = await db
    .select({ audioUrl: tracks.audioUrl })
    .from(tracks)
    .where(eq(tracks.id, id))
    .limit(1);
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
    try {
      const path = await getAudioPathForTrack(ctx.params.id);
      if (!path) {
        return new Response("Not found", { status: 404 });
      }
      file = await Deno.open(path, { read: true });
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return new Response("Not found", { status: 404 });
      }
      throw e;
    }

    try {
      const fileSize = (await file.stat()).size;
      const range = parseRange(ctx.req.headers.get("range"), fileSize);

      const base = new Headers({
        "Content-Type": "audio/mpeg",
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
      const buf = new Uint8Array(length);
      await file.seek(start, Deno.SeekMode.Start);

      let offset = 0;
      while (offset < length) {
        const n = await file.read(buf.subarray(offset));
        if (n === null) break;
        offset += n;
      }

      base.set("Content-Length", String(offset));
      base.set(
        "Content-Range",
        `bytes ${start}-${start + offset - 1}/${fileSize}`,
      );

      return new Response(buf.subarray(0, offset), {
        status: 206,
        headers: base,
      });
    } finally {
      file?.close();
    }
  },
});
