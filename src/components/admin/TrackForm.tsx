import TrackAudioPick from "../../islands/TrackAudioPick.tsx";
import TrackCategoriesPick from "../../islands/TrackCategoriesPick.tsx";
import TrackDifficultyPick from "../../islands/TrackDifficultyPick.tsx";
import TrackTitleInput from "../../islands/TrackTitleInput.tsx";
import { Button } from "../Button.tsx";
import { FieldGroup } from "../ui/FieldGroup.tsx";
import type { CategoryRow } from "../../lib/categories.ts";

const inputLikeClass =
  "plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base-900 dark:text-base-100";

function resolvedDifficulty(
  raw: string | undefined,
): "easy" | "hard" {
  const s = String(raw ?? "easy").trim().toLowerCase();
  return s === "hard" ? "hard" : "easy";
}

function normalizedPath(s: string | undefined): string {
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
        <TrackTitleInput
          id="tr-title"
          inputClass={inputLikeClass}
          initialTitle={props.defaultTitle ?? ""}
        />
      </FieldGroup>
      <FieldGroup label="Audio URL (repo-relative)" htmlFor="tr-audio">
        <TrackAudioPick
          id="tr-audio"
          selectClass={inputLikeClass}
          initialAudioUrl={defaultAudioUrl}
          audioChoices={audioChoices}
        />
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
      <TrackDifficultyPick initialDifficulty={initialDifficulty} />
      <TrackCategoriesPick
        categories={props.categories}
        initialSelectedIds={props.selectedCategoryIds ?? []}
      />
      <Button type="submit" variant="success" class="w-full">
        {props.submitLabel}
      </Button>
    </form>
  );
}
