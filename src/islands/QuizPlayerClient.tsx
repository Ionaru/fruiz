import QuizController from "./QuizController.tsx";
import type { QuizIdentity, QuizTrackPayload } from "../lib/types.ts";

interface QuizPlayerClientProps {
  identity: QuizIdentity;
  replayLimit: number | null;
  tracks: QuizTrackPayload[];
  titleSuggestions: string[];
  quizPath: string;
}

export default function QuizPlayerClient(
  props: Readonly<QuizPlayerClientProps>,
) {
  return (
    <QuizController
      identity={props.identity}
      initialReplayLimit={props.replayLimit}
      tracks={props.tracks}
      titleSuggestions={props.titleSuggestions}
      quizPath={props.quizPath}
    />
  );
}
