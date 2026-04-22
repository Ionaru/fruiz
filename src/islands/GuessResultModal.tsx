import { useSignal, useSignalEffect } from "@preact/signals";
import { confetti } from "@tsparticles/confetti";
import {
  GUESS_RESULT_HEADLINE_ID,
  GuessResultContent,
} from "../components/quiz/GuessResultContent.tsx";
import { isInteractiveFocus } from "../lib/keyboard.ts";

export type GuessResultStatus = "correct" | "incorrect";

export interface GuessResultModalProps {
  status: GuessResultStatus;
  newCollectionAdd: boolean;
  trackTitle: string;
  onDismiss: () => void;
}

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
        // Unique id per mount: tsparticles caches Container by canvas id in a
        // module-level Map. Reusing the default "confetti" id on remount
        // returns a stale Container tied to the prior detached canvas, so no
        // particles render the second time.
        canvas.id = `guess-confetti-${crypto.randomUUID()}`;
        void confetti.create(canvas, {}).then((fire) => {
          void fire({ count: 150, spread: 360, position: { x: 50, y: 50 } });
        });
      }
    }
    return () => {
      dialog.close();
      // Destroy any lingering tsparticles containers. Each `confetti.create`
      // allocates a Container with its own requestAnimationFrame loop; the
      // library never destroys them, so they accumulate across mounts. Detached
      // canvas + throttled rAF during tab idle + a new mount on return can
      // stall the main thread. The modal is the only confetti consumer, so
      // destroying every known container is safe.
      const engine = (globalThis as {
        tsParticles?: {
          dom(): Array<{ destroy(remove?: boolean): void }>;
        };
      }).tsParticles;
      engine?.dom().forEach((container) => container.destroy(false));
    };
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

  return (
    <dialog
      ref={(element) => {
        dialogRef.value = element;
      }}
      class="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent backdrop:backdrop-blur-sm flex items-center justify-center"
      aria-labelledby={GUESS_RESULT_HEADLINE_ID}
    >
      {isCorrect && (
        <canvas
          ref={(element) => {
            canvasRef.value = element;
          }}
          class="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
      <GuessResultContent
        isCorrect={isCorrect}
        trackTitle={props.trackTitle}
        newCollectionAdd={props.newCollectionAdd}
        onDismiss={props.onDismiss}
      />
    </dialog>
  );
}
