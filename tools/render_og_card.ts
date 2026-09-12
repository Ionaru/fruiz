/**
 * Rasterises `tools/og_card.html` into `src/static/og.png`, the Open Graph
 * share card (spec 13).
 *
 * Link unfurlers will not render SVG, so the card is authored as HTML and
 * rasterised once at authoring time. Chrome's `--screenshot` sizes the canvas
 * from `--window-size` but lays the page out in the window's smaller content
 * area, leaving a blank strip along the bottom; the DevTools Protocol sets the
 * viewport exactly instead.
 *
 * Usage:
 *   deno task og:render
 *   deno task og:render --chrome /path/to/chrome
 *
 * The browser is located via `--chrome`, then `CHROME_PATH`, then PATH.
 */
import { decodeBase64 } from "@std/encoding/base64";

import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "../src/lib/siteMeta.ts";

const CARD_SOURCE = new URL("./og_card.html", import.meta.url);
const CARD_OUTPUT = new URL("../src/static/og.png", import.meta.url);

const CHROME_CANDIDATES = [
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable",
];

function parseChromePath(args: readonly string[]): string | null {
  const flagIndex = args.indexOf("--chrome");
  if (flagIndex === -1) return null;
  const chromePath = args[flagIndex + 1];
  if (chromePath === undefined) {
    throw new Error("--chrome needs the path to a Chrome or Chromium binary");
  }
  return chromePath;
}

async function resolveChromePath(args: readonly string[]): Promise<string> {
  const configured = parseChromePath(args) ?? Deno.env.get("CHROME_PATH");
  if (configured) return configured;

  for (const candidate of CHROME_CANDIDATES) {
    try {
      const { success } = await new Deno.Command(candidate, {
        args: ["--version"],
        stdout: "null",
        stderr: "null",
      }).output();
      if (success) return candidate;
    } catch {
      // Not on PATH. Try the next name.
    }
  }
  throw new Error(
    `No browser found. Tried ${CHROME_CANDIDATES.join(", ")}. ` +
      "Pass --chrome <path> or set CHROME_PATH.",
  );
}

/**
 * Chrome writes the DevTools endpoint to stderr once it has bound its port.
 * Reading it back is how port 0 (pick any free port) stays usable.
 */
async function readDevToolsPort(
  stderr: ReadableStream<Uint8Array>,
): Promise<number> {
  const decoder = new TextDecoder();
  let buffered = "";
  for await (const chunk of stderr) {
    buffered += decoder.decode(chunk, { stream: true });
    const endpoint = buffered.match(/ws:\/\/[^\s/]+:(\d+)\//);
    if (endpoint?.[1]) return Number(endpoint[1]);
  }
  throw new Error(
    `The browser exited before reporting a DevTools port:\n${buffered}`,
  );
}

/** A DevTools Protocol connection to a single page target. */
class PageSession {
  readonly #socket: WebSocket;
  #nextCommandId = 1;
  readonly #pending = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    this.#socket.onmessage = (event) => this.#receive(String(event.data));
  }

  static open(endpoint: string): Promise<PageSession> {
    const socket = new WebSocket(endpoint);
    return new Promise((resolve, reject) => {
      socket.onopen = () => resolve(new PageSession(socket));
      socket.onerror = () => reject(new Error(`Cannot reach ${endpoint}`));
    });
  }

  #receive(raw: string) {
    const message = JSON.parse(raw) as {
      id?: number;
      result?: unknown;
      error?: { message: string };
    };
    if (message.id === undefined) return;
    const waiting = this.#pending.get(message.id);
    if (!waiting) return;
    this.#pending.delete(message.id);
    if (message.error) {
      waiting.reject(new Error(`${message.error.message}`));
      return;
    }
    waiting.resolve(message.result);
  }

  send<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.#nextCommandId++;
    this.#socket.send(JSON.stringify({ id, method, params }));
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
      });
    });
  }

  close() {
    this.#socket.close();
  }
}

async function openBlankPage(port: number): Promise<PageSession> {
  const response = await fetch(`http://127.0.0.1:${port}/json/new`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Could not open a page target: HTTP ${response.status}`);
  }
  const target = await response.json() as { webSocketDebuggerUrl: string };
  return await PageSession.open(target.webSocketDebuggerUrl);
}

async function main() {
  const chromePath = await resolveChromePath(Deno.args);
  const browser = new Deno.Command(chromePath, {
    args: [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--remote-debugging-port=0",
    ],
    stdout: "null",
    stderr: "piped",
  }).spawn();

  let page: PageSession | null = null;
  try {
    const port = await readDevToolsPort(browser.stderr);
    page = await openBlankPage(port);

    await page.send("Page.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: Number(OG_IMAGE_WIDTH),
      height: Number(OG_IMAGE_HEIGHT),
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page.send("Page.navigate", { url: CARD_SOURCE.href });
    // The card inlines every asset, so nothing is in flight after navigate and
    // a fixed settle is enough for layout and font selection.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { data } = await page.send<{ data: string }>(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: false },
    );
    await Deno.writeFile(CARD_OUTPUT, decodeBase64(data));
    console.log(
      `Wrote src/static/og.png at ${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT}`,
    );
  } finally {
    page?.close();
    try {
      browser.kill();
    } catch {
      // Already exited.
    }
    await browser.status;
  }
}

await main();
