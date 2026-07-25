export function buildChallengeShareText(
  score: number,
  total: number,
  quizUrl: string,
): string {
  return `I scored ${score}/${total} on this quiz, can you beat me? ${quizUrl}`;
}
