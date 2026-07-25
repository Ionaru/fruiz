import { useSignal, useSignalEffect } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";

type CopyStatus = "idle" | "copied" | "failed";

export interface ChallengeShareModalProps {
  shareText: string;
  onDismiss: () => void;
}

const COPY_RESET_MS = 2000;

const COPY_LABELS: Record<CopyStatus, string> = {
  idle: "Copy",
  copied: "Copied!",
  failed: "Couldn't copy",
};

const CHALLENGE_SHARE_HEADLINE_ID = "challenge-share-headline";

export function ChallengeShareModal(props: Readonly<ChallengeShareModalProps>) {
  const dialogRef = useSignal<HTMLDialogElement | null>(null);
  const copyStatus = useSignal<CopyStatus>("idle");

  // Open the dialog as modal on mount, close on unmount.
  useSignalEffect(() => {
    const dialog = dialogRef.value;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  });

  // Native cancel event (Escape key).
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

  // Backdrop click dismiss, scoped via addEventListener so the JSX stays free
  // of event handlers on the non-interactive <dialog> (see GuessResultModal).
  useSignalEffect(() => {
    const dialog = dialogRef.value;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) props.onDismiss();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  });

  // Copy feedback is transient: fall back to the idle label after a moment.
  useSignalEffect(() => {
    if (copyStatus.value === "idle") return;
    const timerId = globalThis.setTimeout(() => {
      copyStatus.value = "idle";
    }, COPY_RESET_MS);
    return () => globalThis.clearTimeout(timerId);
  });

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(props.shareText);
      copyStatus.value = "copied";
    } catch {
      copyStatus.value = "failed";
    }
  };

  return (
    <dialog
      ref={(element) => {
        dialogRef.value = element;
      }}
      class="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent backdrop:backdrop-blur-sm flex items-center justify-center"
      aria-labelledby={CHALLENGE_SHARE_HEADLINE_ID}
    >
      <PlateauCard class="w-full max-w-md mx-4 space-y-4 text-base-900 dark:text-base-100">
        <h2 id={CHALLENGE_SHARE_HEADLINE_ID} class="text-xl font-semibold">
          Challenge a friend
        </h2>
        <p class="text-sm opacity-90">
          Send this to a friend: the link recreates this exact quiz on their
          device.
        </p>
        <textarea
          readOnly
          rows={3}
          value={props.shareText}
          aria-label="Challenge message"
          class="plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base-900 dark:text-base-100 text-sm resize-none"
          onFocus={(event) => event.currentTarget.select()}
        />
        <div class="flex gap-3">
          <Button
            class="flex-1"
            variant="info"
            onClick={() => void copyShareText()}
          >
            <span aria-live="polite">{COPY_LABELS[copyStatus.value]}</span>
          </Button>
          <Button class="flex-1" onClick={props.onDismiss}>
            Close
          </Button>
        </div>
      </PlateauCard>
    </dialog>
  );
}
