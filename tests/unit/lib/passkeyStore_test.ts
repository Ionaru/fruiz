import { assertEquals } from "@std/assert";
import { DrizzlePasskeyStore } from "../../../src/lib/passkeyStore.ts";

Deno.test("challenge store: take returns the entry once, then null", () => {
  const store = new DrizzlePasskeyStore();
  const id = crypto.randomUUID();
  store.putChallenge(id, { challenge: "abc", expiresAt: Date.now() + 60_000 });

  assertEquals(store.takeChallenge(id)?.challenge, "abc");
  assertEquals(store.takeChallenge(id), null);
});

Deno.test("challenge store: expired entry is dropped", () => {
  const store = new DrizzlePasskeyStore();
  const id = crypto.randomUUID();
  store.putChallenge(id, { challenge: "expired", expiresAt: Date.now() - 1 });

  assertEquals(store.takeChallenge(id), null);
});

Deno.test("challenge store: unknown id returns null", () => {
  const store = new DrizzlePasskeyStore();
  assertEquals(store.takeChallenge(crypto.randomUUID()), null);
});
</content>
