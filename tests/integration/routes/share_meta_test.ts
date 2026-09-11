import { assert, assertEquals } from "@std/assert";

import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
} from "../../../src/lib/siteMeta.ts";

const workspaceRoot = new URL("../../../", import.meta.url);

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

Deno.test("the share image is a PNG of exactly the declared dimensions", async () => {
  // `og:image:width` / `og:image:height` are what earn the large embed instead
  // of a thumbnail, so a drift between the declared size and the real file is
  // a silent downgrade. This is the only check that catches it.
  const imageUrl = new URL(`src/static${OG_IMAGE_PATH}`, workspaceRoot);
  const bytes = await Deno.readFile(imageUrl);

  assertEquals(
    bytes.slice(0, PNG_SIGNATURE.length),
    PNG_SIGNATURE,
    "the share image must be a real PNG; unfurlers will not render SVG",
  );

  // IHDR is the first chunk: width and height are big-endian u32 at 16 and 20.
  const header = new DataView(bytes.buffer, bytes.byteOffset);
  assertEquals(String(header.getUint32(16)), OG_IMAGE_WIDTH);
  assertEquals(String(header.getUint32(20)), OG_IMAGE_HEIGHT);
});

Deno.test("the share image stays well inside the size unfurlers accept", async () => {
  const imageUrl = new URL(`src/static${OG_IMAGE_PATH}`, workspaceRoot);
  const { size } = await Deno.stat(imageUrl);
  assert(
    size < 2_000_000,
    `share image is ${size} bytes; Discord caps around 8 MB`,
  );
});

Deno.test("no route builds a share URL from the request origin", async () => {
  // Behind the reverse proxy the request origin is the internal hop, so a URL
  // built from it is not fetchable by an unfurler. The canonical origin comes
  // from `resolveCanonicalOrigin` instead.
  const offenders: string[] = [];
  for await (
    const entry of walkSourceFiles(new URL("src/routes/", workspaceRoot))
  ) {
    const source = stripComments(await Deno.readTextFile(entry));
    if (/new URL\(ctx\.req\.url\)\.origin|\burl\.origin\b/.test(source)) {
      offenders.push(entry.pathname);
    }
  }
  assertEquals(
    offenders,
    [],
    `routes using the request origin: ${offenders.join(", ")}`,
  );
});

/** Comments explain the rule; only real code should be able to break it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

Deno.test("share copy is not duplicated into route files", async () => {
  // Every user-facing share string lives in src/lib/siteMeta.ts. A literal
  // copy in a route is how the card and the page drift apart.
  const tagline = "Do you know where the music is from?";
  const offenders: string[] = [];
  for await (
    const entry of walkSourceFiles(new URL("src/routes/", workspaceRoot))
  ) {
    const source = stripComments(await Deno.readTextFile(entry));
    if (source.includes(tagline)) offenders.push(entry.pathname);
  }
  assertEquals(
    offenders,
    [],
    `routes hardcoding the tagline: ${offenders.join(", ")}`,
  );
});

async function* walkSourceFiles(dir: URL): AsyncGenerator<URL> {
  for await (const entry of Deno.readDir(dir)) {
    const entryUrl = new URL(entry.name, dir);
    if (entry.isDirectory) {
      yield* walkSourceFiles(new URL(`${entry.name}/`, dir));
      continue;
    }
    if (entry.isFile && /\.tsx?$/.test(entry.name)) yield entryUrl;
  }
}
