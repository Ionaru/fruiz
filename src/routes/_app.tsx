import { define } from "../utils.ts";
import PreloadGuard from "../islands/PreloadGuard.tsx";

export default define.page(function App({ Component }) {
  const revision = (
    Deno.env.get("FRUIZ_GIT_REVISION") ??
      Deno.env.get("DENO_DEPLOYMENT_ID") ??
      "local"
  ).trim();

  return (
    <html lang="en" class="preload">
      <head>
        <meta charset="utf-8" />
        {
          /* `interactive-widget=resizes-content` makes the on-screen keyboard
            shrink the layout viewport, so the page reflows above it instead of
            being covered by it and everything below the focused field stays
            reachable by ordinary page scrolling. Chrome 108+ and Firefox 132+
            honour it; Safari ignores the key entirely, which is why the answer
            combobox sizes its suggestion popup from `visualViewport` rather
            than relying on this (see src/lib/suggestionPopupLayout.ts). */
        }
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content"
        />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
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
        <PreloadGuard />
      </body>
    </html>
  );
});
