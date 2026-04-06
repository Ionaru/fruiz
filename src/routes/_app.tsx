import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  const revision = (
    Deno.env.get("FRUIZ_GIT_REVISION") ??
      Deno.env.get("DENO_DEPLOYMENT_ID") ??
      "local"
  ).trim();

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>fruiz</title>
      </head>
      <body>
        <Component />
        <div
          class="pointer-events-none fixed bottom-2 right-2 z-100 rounded bg-base-200/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-base-500 backdrop-blur-sm dark:bg-base-800/80 dark:text-base-400"
          title="Git revision"
        >
          {revision}
        </div>
      </body>
    </html>
  );
});
