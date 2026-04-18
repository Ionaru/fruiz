import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";

export const GUESS_RESULT_HEADLINE_ID = "guess-result-headline";

export interface GuessResultContentProps {
  isCorrect: boolean;
  trackTitle: string;
  newCollectionAdd: boolean;
  onDismiss: () => void;
}

export function GuessResultContent(props: Readonly<GuessResultContentProps>) {
  const headline = props.isCorrect ? "Correct!" : "Not quite";
  const variantClass = props.isCorrect ? "success" : "danger";

  return (
    <PlateauCard
      class={`${variantClass} w-full max-w-sm space-y-4 text-center mx-4 z-50`}
    >
      <div class="space-y-4">
        <h2 id={GUESS_RESULT_HEADLINE_ID} class="text-2xl font-bold">
          {headline}
        </h2>
        {props.isCorrect
          ? (
            <>
              <p class="text-lg font-medium">{props.trackTitle}</p>
              {props.newCollectionAdd && (
                <p class="text-sm opacity-90">
                  Added to your collection.
                </p>
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
