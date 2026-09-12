/**
 * Deployment identity read from the environment.
 *
 * `FRUIZ_RP_ID` is the WebAuthn Relying Party ID and the only place the
 * deployed domain is configured, so share metadata derives the canonical origin
 * from it too (see `siteMeta.ts`). The getters live here because both consumers
 * must agree on the fallback.
 */

/** The dev fallback. A deployment that leaves `FRUIZ_RP_ID` unset lands here. */
export const DEFAULT_RP_ID = "localhost";

export function getRpId(): string {
  return Deno.env.get("FRUIZ_RP_ID") ?? DEFAULT_RP_ID;
}

export function getRpName(): string {
  return Deno.env.get("FRUIZ_RP_NAME") ?? "Musical Quiz";
}
