import { assertEquals } from "jsr:@std/assert@1";
import { mulberry32, seedStringToUint32 } from "../../../lib/prng.ts";

Deno.test("mulberry32 is deterministic for the same seed", () => {
  const genA = mulberry32(12345);
  const seq = [genA(), genA(), genA()];
  const genB = mulberry32(12345);
  assertEquals([genB(), genB(), genB()], seq);
});

Deno.test("seedStringToUint32 is stable for a fixed string", () => {
  assertEquals(
    seedStringToUint32("quiz-seed"),
    seedStringToUint32("quiz-seed"),
  );
});
