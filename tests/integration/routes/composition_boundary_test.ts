import { assert, assertEquals } from "@std/assert";

const workspaceRoot = new URL("../../../", import.meta.url);

async function collectTsFiles(dir: URL): Promise<URL[]> {
  const found: URL[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const url = new URL(entry.name, dir);
    if (entry.isDirectory) {
      const nested = await collectTsFiles(new URL(`${entry.name}/`, dir));
      found.push(...nested);
      continue;
    }
    if (
      entry.isFile &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      found.push(url);
    }
  }
  return found;
}

Deno.test("components do not import islands", async () => {
  const componentsDir = new URL("src/components/", workspaceRoot);
  const componentFiles = await collectTsFiles(componentsDir);
  const offenders: string[] = [];

  for (const fileUrl of componentFiles) {
    const source = await Deno.readTextFile(fileUrl);
    if (
      source.includes("/islands/") ||
      source.includes("../islands/") ||
      source.includes("../../islands/")
    ) {
      offenders.push(fileUrl.pathname);
    }
  }

  assertEquals(
    offenders,
    [],
    `Components importing islands: ${offenders.join(", ")}`,
  );
});

Deno.test("routes use island entrypoints for interactive track and quiz composition", async () => {
  const adminCreateRoute = await Deno.readTextFile(
    new URL("src/routes/admin/tracks/new.tsx", workspaceRoot),
  );
  const adminEditRoute = await Deno.readTextFile(
    new URL("src/routes/admin/tracks/[id].tsx", workspaceRoot),
  );
  const quizRoute = await Deno.readTextFile(
    new URL("src/routes/quiz/[category]/[slug]/index.tsx", workspaceRoot),
  );

  assert(
    adminCreateRoute.includes(
      'import TrackForm from "../../../islands/TrackForm.tsx";',
    ),
  );
  assert(
    adminEditRoute.includes(
      'import TrackForm from "../../../islands/TrackForm.tsx";',
    ),
  );
  assert(quizRoute.includes("import QuizPlayerClient"));
  assert(quizRoute.includes("<QuizPlayerClient"));
});
