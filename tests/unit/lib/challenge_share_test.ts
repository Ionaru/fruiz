import { assertEquals } from "@std/assert";
import { buildChallengeShareText } from "../../../src/lib/challengeShare.ts";

Deno.test("buildChallengeShareText composes the score and quiz url", () => {
  assertEquals(
    buildChallengeShareText(15, 20, "https://fruiz.example/quiz/disney/m8AB"),
    "I scored 15/20 on this quiz, can you beat me? https://fruiz.example/quiz/disney/m8AB",
  );
});

Deno.test("buildChallengeShareText keeps a zero score intact", () => {
  assertEquals(
    buildChallengeShareText(0, 20, "https://fruiz.example/quiz/disney/m8AB"),
    "I scored 0/20 on this quiz, can you beat me? https://fruiz.example/quiz/disney/m8AB",
  );
});
