import { Button } from "../Button.tsx";
import { FieldGroup } from "../ui/FieldGroup.tsx";
import { TextInput } from "../ui/TextInput.tsx";
import { SelectInput } from "../ui/SelectInput.tsx";
import { CheckControl } from "../ui/CheckControl.tsx";
import { CheckGroup } from "../ui/CheckGroup.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import type { CategoryRow } from "../../lib/categories.ts";
import { DEFAULT_MAX_PLAY_SECONDS } from "../../lib/quizPlayback.ts";

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
  /** Seconds; null/undefined = leave blank (stored as null, resolved to 0). */
  defaultPlayStartSeconds?: number | null;
  /** Seconds; null/undefined = leave blank (stored as null, app default max). */
  defaultMaxPlaySeconds?: number | null;
  /** When set, the form element gets this `id` (e.g. for playback preview). */
  formDomId?: string;
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
    <PlateauCard class="w-full" padding="5">
      <form
        id={props.formDomId}
        method={props.method ?? "post"}
        action={props.action}
        class="space-y-4"
      >
        <FieldGroup label="Title" htmlFor="tr-title">
          <TextInput
            id="tr-title"
            name="title"
            type="text"
            required
            value={props.defaultTitle ?? ""}
          />
        </FieldGroup>
        <FieldGroup label="Audio URL (repo-relative)" htmlFor="tr-audio">
          <SelectInput
            id="tr-audio"
            name="audioUrl"
            required
            value={defaultAudioUrl}
          >
            <option value="">Select audio file...</option>
            {audioChoices.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </SelectInput>
          {defaultIsMissing && (
            <p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Current value is no longer in `data/music`; choose an existing
              file to save.
            </p>
          )}
          {audioChoices.length === 0 && (
            <p class="mt-1 text-xs text-base-600 dark:text-base-300">
              Add audio files under `data/music` to select one here.
            </p>
          )}
        </FieldGroup>
        <CheckGroup
          legend="Difficulty"
          class="space-y-1"
          optionsClass="flex gap-3 pt-1"
        >
          {(["easy", "hard"] as const).map((option) => (
            <CheckControl
              key={option}
              type="radio"
              name="difficulty"
              value={option}
              checked={initialDifficulty === option}
              label={option}
              class="capitalize"
            />
          ))}
        </CheckGroup>
        <FieldGroup label="Playback start (seconds)" htmlFor="tr-play-start">
          <TextInput
            id="tr-play-start"
            name="playStartSeconds"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={props.defaultPlayStartSeconds == null
              ? ""
              : String(props.defaultPlayStartSeconds)}
            placeholder="0"
          />
          <p class="text-xs opacity-80">
            Optional. Leave blank to start at the beginning of the file.
          </p>
        </FieldGroup>
        <FieldGroup label="Max play length (seconds)" htmlFor="tr-max-play">
          <TextInput
            id="tr-max-play"
            name="maxPlaySeconds"
            type="number"
            inputMode="decimal"
            min={2.5}
            step="any"
            defaultValue={props.defaultMaxPlaySeconds == null
              ? ""
              : String(props.defaultMaxPlaySeconds)}
            placeholder={`${DEFAULT_MAX_PLAY_SECONDS}`}
          />
          <p class="text-xs opacity-80">
            Optional. Leave blank for app default (includes fade-in/out).
          </p>
        </FieldGroup>
        <CheckGroup legend="Categories">
          {props.categories.map((category) => {
            const categoryId = String(category.id);
            return (
              <CheckControl
                key={categoryId}
                type="checkbox"
                name="categoryIds"
                value={categoryId}
                checked={(props.selectedCategoryIds ?? []).includes(
                  categoryId,
                )}
                label={category.name}
              />
            );
          })}
        </CheckGroup>
        <Button type="submit" variant="success" class="w-full">
          {props.submitLabel}
        </Button>
      </form>
    </PlateauCard>
  );
}
