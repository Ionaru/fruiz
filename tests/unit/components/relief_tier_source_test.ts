import { assertEquals } from "@std/assert";

const workspaceRoot = new URL("../../../", import.meta.url);

async function collectSourceFiles(dir: URL): Promise<URL[]> {
  const found: URL[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isDirectory) {
      found.push(...await collectSourceFiles(new URL(`${entry.name}/`, dir)));
      continue;
    }
    if (
      entry.isFile &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      found.push(new URL(entry.name, dir));
    }
  }
  return found;
}

/** True for a line that is prose rather than markup, where naming a tier is fine. */
function isComment(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("*") || trimmed.startsWith("//") ||
    trimmed.startsWith("/*");
}

/**
 * The raised relief tiers belong to `styles.css`, never to a component's class
 * list.
 *
 * Tailwind emits its utilities layer after its components layer, so an
 * `nm-protrude-*` utility outranks the `styles.css` rules that give a plateau
 * its hover and pressed states (they set the same custom properties) and
 * silently leaves the control unreactive. `.plateau` and `.plateau-shallow` are
 * the two supported tiers, each carrying its own interactive states (spec 07).
 *
 * `nm-dent-*` is not covered: a dent is a surface pressed into the page, not a
 * tier of the raised scale, and nothing it is used on is a control.
 */
Deno.test("raised relief tiers are not set from markup", async () => {
  const sourceFiles = await collectSourceFiles(new URL("src/", workspaceRoot));
  const offenders: string[] = [];

  for (const fileUrl of sourceFiles) {
    const source = await Deno.readTextFile(fileUrl);
    for (const [index, line] of source.split("\n").entries()) {
      if (isComment(line)) continue;
      if (/\bnm-protrude(?:-[a-z0-9]+)?\b/.test(line)) {
        offenders.push(`${fileUrl.pathname}:${index + 1}`);
      }
    }
  }

  assertEquals(
    offenders,
    [],
    `Relief utilities in markup silently disable a control's hover and pressed states. Use \`plateau-shallow\` instead: ${
      offenders.join(", ")
    }`,
  );
});
