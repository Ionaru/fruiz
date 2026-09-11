/**
 * Deployment identity read from the environment.
 *
 * `FRUIZ_RP_ID` started life as the WebAuthn Relying Party ID, but it is the
 * only place the deployed domain is configured, so share metadata derives the
 * canonical origin from it too (see `siteMeta.ts`). Both consumers must agree
 * on the fallback, which is why the getters live here rather than in either
 * caller.
 */

/** The dev fallback. A deployment that leaves `FRUIZ_RP_ID` unset lands here. */
export const DEFAULT_RP_ID = "localhost";

export function getRpId(): string {
  return Deno.env.get("FRUIZ_RP_ID") ?? DEFAULT_RP_ID;
}

export function getRpName(): string {
  return Deno.env.get("FRUIZ_RP_NAME") ?? "Musical Quiz";
}
