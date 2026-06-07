import { useSignal, useSignalEffect } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { SelectInput } from "../components/ui/SelectInput.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";
import { normalizeAnswer } from "../lib/normalize.ts";
import { isValidSuggestionUrl } from "../lib/suggestionValidation.ts";
import type { CategoryRow } from "../lib/categories.ts";
import AnswerInput from "./AnswerInput.tsx";

export interface TrackSuggestionFormProps {
  categories: CategoryRow[];
  formAction: string;
}

export default function TrackSuggestionForm(
  props: Readonly<TrackSuggestionFormProps>,
) {
  const selectedCategoryKey = useSignal("");
  const searchValue = useSignal("");
  const title = useSignal("");
  const youtubeUrl = useSignal("");
  const existingTitles = useSignal<string[]>([]);
  const loadingTitles = useSignal(false);
  const submitting = useSignal(false);

  // Populate the autocomplete pool for the chosen category from the existing
  // API (reads only titles; no DB access in the browser).
  useSignalEffect(() => {
    const key = selectedCategoryKey.value;
    if (key === "") {
      existingTitles.value = [];
      return;
    }
    let cancelled = false;
    loadingTitles.value = true;
    fetch(`/api/categories/${encodeURIComponent(key)}/tracks`)
      .then((response) => (response.ok ? response.json() : { tracks: [] }))
      .then((body) => {
        if (cancelled) return;
        const tracks = Array.isArray(body?.tracks) ? body.tracks : [];
        existingTitles.value = tracks.map((entry: { title: string }) =>
          String(entry.title)
        );
      })
      .catch(() => {
        if (!cancelled) existingTitles.value = [];
      })
      .finally(() => {
        if (!cancelled) loadingTitles.value = false;
      });
    return () => {
      cancelled = true;
    };
  });

  const categoryChosen = selectedCategoryKey.value !== "";
  const normalizedSearch = normalizeAnswer(searchValue.value);
  const alreadyExists = normalizedSearch !== "" &&
    existingTitles.value.some((existing) =>
      normalizeAnswer(existing) === normalizedSearch
    );

  const canSubmit = categoryChosen &&
    title.value.trim() !== "" &&
    isValidSuggestionUrl(youtubeUrl.value) &&
    !submitting.value;

  return (
    <div class="flex flex-col gap-5">
      <FieldGroup label="Category" htmlFor="suggest-category">
        <SelectInput
          id="suggest-category"
          value={selectedCategoryKey.value}
          onInput={(event) => {
            selectedCategoryKey.value =
              (event.currentTarget as HTMLSelectElement).value;
          }}
        >
          <option value="">Pick a category…</option>
          {props.categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </SelectInput>
      </FieldGroup>

      <div class="flex flex-col gap-1">
        <AnswerInput
          instanceId="suggest"
          label="Search existing tracks"
          suggestions={existingTitles.value}
          value={searchValue.value}
          disabled={!categoryChosen}
          onValue={(next) => {
            searchValue.value = next;
          }}
        />
        <p class="text-xs opacity-70 text-center">
          {!categoryChosen
            ? "Pick a category first to search its tracks."
            : loadingTitles.value
            ? "Loading existing tracks…"
            : alreadyExists
            ? "Heads up: a track with this title already exists in this category."
            : "Search to make sure the track isn't already in this category."}
        </p>
      </div>

      <form
        method="post"
        action={props.formAction}
        class="flex flex-col gap-5"
        onSubmit={() => {
          submitting.value = true;
        }}
      >
        <input
          type="hidden"
          name="categoryKey"
          value={selectedCategoryKey.value}
        />
        <FieldGroup label="Track title" htmlFor="suggest-title">
          <TextInput
            id="suggest-title"
            name="title"
            required
            value={title.value}
            disabled={!categoryChosen}
            placeholder="The title players should guess"
            onInput={(event) => {
              title.value = (event.currentTarget as HTMLInputElement).value;
            }}
          />
        </FieldGroup>
        <FieldGroup label="YouTube link" htmlFor="suggest-url">
          <TextInput
            id="suggest-url"
            name="youtubeUrl"
            type="url"
            required
            value={youtubeUrl.value}
            disabled={!categoryChosen}
            placeholder="https://www.youtube.com/watch?v=…"
            onInput={(event) => {
              youtubeUrl.value =
                (event.currentTarget as HTMLInputElement).value;
            }}
          />
          {youtubeUrl.value.trim() !== "" &&
            !isValidSuggestionUrl(youtubeUrl.value) && (
            <p class="text-xs text-red-800 dark:text-red-200">
              Enter a valid link starting with http:// or https://.
            </p>
          )}
        </FieldGroup>
        <Button
          type="submit"
          variant="success"
          class="w-full"
          disabled={!canSubmit}
        >
          {submitting.value ? "Submitting…" : "Submit suggestion"}
        </Button>
      </form>
    </div>
  );
}
