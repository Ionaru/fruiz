import { useSignalEffect } from "@preact/signals";

/**
 * Removes the `preload` class from `<html>` once the first styled frame has
 * painted, re-enabling CSS transitions. The class is set server-side in
 * routes/_app.tsx so transitions stay suppressed during the initial (and, in
 * dev, the re-injected) render — otherwise the broad `transition-all` on
 * `.plateau` surfaces animates from default to styled state, visible as a flash
 * when navigating with the HTTP cache disabled.
 *
 * Renders no markup; it exists only to run this client-side side effect.
 */
export default function PreloadGuard() {
  useSignalEffect(() => {
    const html = document.documentElement;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => html.classList.remove("preload"))
    );
  });
  return null;
}
