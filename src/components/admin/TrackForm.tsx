import { Button } from "../Button.tsx";
import { FieldGroup } from "../ui/FieldGroup.tsx";
import type { CategoryRow } from "../../lib/categories.ts";

export const trackInputLikeClass =
  "plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base-900 dark:text-base-100";

export function resolvedDifficulty(
  raw: string | undefined,
): "easy" | "hard" {
  const s = String(raw ?? "easy").trim().toLowerCase();
  return s === "hard" ? "hard" : "easy";
}

export function normalizedPath(s: string | undefined): string {
  return String(s ?? "").trim().replaceAll("\\", "/");
}

export interface TrackFormProps {
  action: string;
  method?: "post";
  categories: CategoryRow[];
  audioChoices: string[];
  selectedCategoryIds?: string[];
  defaultTitle?: string;
  defaultAudioUrl?: string;
  defaultDifficulty?: "easy" | "hard";
  submitLabel: string;
}

export function TrackForm(props: Readonly<TrackFormProps>) {
  const initialDifficulty = resolvedDifficulty(props.defaultDifficulty);
  const defaultAudioUrl = normalizedPath(props.defaultAudioUrl);
  const audioChoices = Array.from(
    new Set(
      [...props.audioChoices, defaultAudioUrl]
        .map((v) => normalizedPath(v))
        .filter((v) => v !== ""),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const defaultIsMissing = defaultAudioUrl !== "" &&
    !props.audioChoices.some((v) => normalizedPath(v) === defaultAudioUrl);

  return (
    <form
      method={props.method ?? "post"}
      action={props.action}
      class="plateau w-full rounded-2xl p-5 space-y-4"
    >
      <FieldGroup label="Title" htmlFor="tr-title">
        <input
          id="tr-title"
          name="title"
          type="text"
          required
          class={trackInputLikeClass}
          value={props.defaultTitle ?? ""}
        />
      </FieldGroup>
      <FieldGroup label="Audio URL (repo-relative)" htmlFor="tr-audio">
        <select
          id="tr-audio"
          name="audioUrl"
          required
          class={trackInputLikeClass}
          value={defaultAudioUrl}
        >
          <option value="">Select audio file...</option>
          {audioChoices.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
        {defaultIsMissing && (
          <p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Current value is no longer in `data/music`; choose an existing file
            to save.
          </p>
        )}
        {audioChoices.length === 0 && (
          <p class="mt-1 text-xs text-base-600 dark:text-base-300">
            Add audio files under `data/music` to select one here.
          </p>
        )}
      </FieldGroup>
      <fieldset class="space-y-1">
        <legend class="text-sm font-medium">Difficulty</legend>
        <div class="flex gap-3 pt-1">
          {(["easy", "hard"] as const).map((option) => (
            <label
              key={option}
              class="flex items-center gap-2 text-sm capitalize"
            >
              <input
                type="radio"
                name="difficulty"
                value={option}
                class="h-4 w-4 shrink-0 accent-emerald-600 dark:accent-emerald-400"
                checked={initialDifficulty === option}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">Categories</legend>
        <div class="flex flex-col gap-2">
          {props.categories.map((category) => {
            const categoryId = String(category.id);
            return (
              <label key={categoryId} class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={categoryId}
                  class="h-4 w-4 shrink-0 accent-emerald-600 dark:accent-emerald-400"
                  checked={(props.selectedCategoryIds ?? []).includes(
                    categoryId,
                  )}
                />
                {category.name}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit" variant="success" class="w-full">
        {props.submitLabel}
      </Button>
    </form>
  );
}
