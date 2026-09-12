import { useSignalEffect } from "@preact/signals";

/**
 * Removes the `preload` class from `<html>` once the first styled frame has
 * painted, re-enabling CSS transitions. The class is set server-side in
 * routes/_app.tsx: without it the broad `transition-all` on `.plateau` animates
 * from default to styled state, visible as a flash when the stylesheet is
 * applied after the first unstyled render.
 *
 * Renders no markup.
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
