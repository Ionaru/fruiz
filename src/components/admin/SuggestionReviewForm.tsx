import { Button } from "../Button.tsx";

export interface SuggestionReviewFormProps {
  action: string;
  defaultNote?: string;
}

const textareaClass =
  "plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base-900 dark:text-base-100 min-h-24";

export function SuggestionReviewForm(
  props: Readonly<SuggestionReviewFormProps>,
) {
  return (
    <form
      method="post"
      action={props.action}
      class="plateau w-full rounded-2xl p-5 space-y-3"
    >
      <label class="block text-sm space-y-2">
        <span class="font-medium">Note to the player (optional)</span>
        <textarea
          id="review-note"
          name="note"
          class={textareaClass}
          defaultValue={props.defaultNote ?? ""}
          placeholder="Explain your decision (shown to the player)…"
        />
      </label>
      <div class="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="intent"
          value="approve"
          variant="success"
          class="flex-1"
        >
          Approve
        </Button>
        <Button
          type="submit"
          name="intent"
          value="deny"
          variant="danger"
          class="flex-1"
        >
          Deny
        </Button>
      </div>
      <p class="text-xs opacity-70">
        Approving or denying only sends feedback to the player. Adding the track
        to the quiz stays a manual step.
      </p>
    </form>
  );
}
