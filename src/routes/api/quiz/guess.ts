import { define } from "../../../utils.ts";
import { parseGuessBody } from "../../../lib/guessTelemetry.ts";
import { guessSubmittedCounter } from "../../../lib/telemetry.ts";

/**
 * Fire-and-forget telemetry sink for guess outcomes. Guess scoring is
 * client-side (QuizController), so the island POSTs the boolean result here to
 * emit `fruiz.guess.submitted` server-side — telemetry stays out of the bundle.
 */
export const handler = define.handlers({
  async POST(ctx) {
    let raw: unknown;
    try {
      raw = await ctx.req.json();
    } catch {
      return new Response(null, { status: 400 });
    }
    const body = parseGuessBody(raw);
    if (body === null) return new Response(null, { status: 400 });
    guessSubmittedCounter.add(1, { matched: body.matched });
    return new Response(null, { status: 204 });
  },
});
