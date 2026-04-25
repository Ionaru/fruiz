import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import {
  type CategoryCollectionProgress,
  formatCategoryProgressLine,
} from "../../lib/collectionProgress.ts";
import { FaTrophy } from "react-icons/fa6";
import { PillLink } from "../ui/PillLink.tsx";

export const GUESS_RESULT_HEADLINE_ID = "guess-result-headline";

export interface GuessResultContentProps {
  isCorrect: boolean;
  trackTitle: string;
  newCollectionAdd: boolean;
  progress: CategoryCollectionProgress | null;
  onDismiss: () => void;
}

export function GuessResultContent(props: Readonly<GuessResultContentProps>) {
  const headline = props.isCorrect ? "Correct!" : "Incorrect";
  const variantClass = props.isCorrect ? "success" : "danger";

  return (
    <PlateauCard
      class={`${variantClass} w-full max-w-sm space-y-4 text-center mx-4 z-50`}
    >
      <div class="space-y-4">
        <h2
          id={GUESS_RESULT_HEADLINE_ID}
          class="text-2xl font-bold flex flex-col items-center justify-center gap-2"
        >
          {headline}
          {props.isCorrect && <FaTrophy size={96} />}
        </h2>
        {props.isCorrect
          ? (
            <>
              <p class="text-lg font-bold">{props.trackTitle}</p>
              {props.newCollectionAdd && (
                <>
                  <div class="space-y-1">
                    <p class="text-sm opacity-90 font-bold">
                      *NEW*
                    </p>
                    {props.progress && (
                      <p class="text-sm opacity-90">
                        {formatCategoryProgressLine(props.progress)}
                      </p>
                    )}
                  </div>
                  <PillLink href="/collection" class="block">
                    View collection
                  </PillLink>
                </>
              )}
              <Button
                class="w-full"
                variant="success"
                autofocus
                onClick={props.onDismiss}
              >
                Continue
              </Button>
            </>
          )
          : <p class="text-sm opacity-90">Keep listening.</p>}
      </div>
    </PlateauCard>
  );
}
