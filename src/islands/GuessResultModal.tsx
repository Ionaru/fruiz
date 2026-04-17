import { useSignal, useSignalEffect } from "@preact/signals";
import { confetti } from "@tsparticles/confetti";
import { Button } from "../components/Button.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { isInteractiveFocus } from "../lib/keyboard.ts";

export type GuessResultStatus = "correct" | "incorrect";

export interface GuessResultModalProps {
  status: GuessResultStatus;
  newCollectionAdd: boolean;
  trackTitle: string;
  onDismiss: () => void;
}

const HEADLINE_ID = "guess-result-headline";
const INCORRECT_AUTO_DISMISS_MS = 3000;

export function GuessResultModal(props: Readonly<GuessResultModalProps>) {
  const dialogRef = useSignal<HTMLDialogElement | null>(null);

  const canvasRef = useSignal<HTMLCanvasElement | null>(null);

  // Open the dialog as modal on mount, fire confetti for correct, close on unmount.
  useSignalEffect(() => {
    const dialog = dialogRef.value;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    if (props.status === "correct") {
      const canvas = canvasRef.value;
      if (canvas) {
        void confetti.create(canvas, {}).then((fire) => {
          void fire({ count: 150, spread: 360, position: { x: 50, y: 50 } });
        });
      }
    }
    return () => dialog.close();
  });

  // Auto-dismiss for incorrect guesses.
  useSignalEffect(() => {
    if (props.status !== "incorrect") return;
    const timerId = globalThis.setTimeout(
      props.onDismiss,
      INCORRECT_AUTO_DISMISS_MS,
    );
    return () => globalThis.clearTimeout(timerId);
  });

  // Native cancel event (Escape key) — let the browser handle Esc natively.
  useSignalEffect(() => {
    const dialog = dialogRef.value;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      props.onDismiss();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  });

  // Enter key dismiss and backdrop click — scoped to the dialog element via
  // addEventListener so the JSX stays free of event handlers on the
  // non-interactive <dialog>, avoiding a11y lint warnings (S6847).
  useSignalEffect(() => {
    const dialog = dialogRef.value;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (isInteractiveFocus()) return;
      event.preventDefault();
      props.onDismiss();
    };
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) props.onDismiss();
    };
    dialog.addEventListener("keydown", onKeyDown);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      dialog.removeEventListener("click", onClick);
    };
  });

  const isCorrect = props.status === "correct";
  const headline = isCorrect ? "Correct!" : "Not quite";
  const variantClass = isCorrect ? "success" : "danger";

  return (
    <dialog
      ref={(element) => {
        dialogRef.value = element;
      }}
      class="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent backdrop:backdrop-blur-sm flex items-center justify-center"
      aria-labelledby={HEADLINE_ID}
    >
      {isCorrect && (
        <canvas
          ref={(element) => {
            canvasRef.value = element;
          }}
          class="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
      <PlateauCard
        class={`${variantClass} w-full max-w-sm space-y-4 text-center mx-4 z-50`}
      >
        <div class="space-y-4">
          <h2 id={HEADLINE_ID} class="text-2xl font-bold">
            {headline}
          </h2>
          {isCorrect
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
    </dialog>
  );
}
