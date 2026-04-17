import TrackAudioPick from "./TrackAudioPick.tsx";
import TrackTitleInput from "./TrackTitleInput.tsx";
import CheckboxGroupField from "./CheckboxGroupField.tsx";
import RadioGroupField from "./RadioGroupField.tsx";
import { normalizedPath, resolvedDifficulty } from "../lib/trackFormHelpers.ts";
import { Button } from "../components/Button.tsx";
import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";
import { DEFAULT_MAX_PLAY_SECONDS } from "../lib/quizPlayback.ts";
import type { CategoryRow } from "../lib/categories.ts";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "easy" },
  { value: "hard", label: "hard" },
] as const;

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

export default function TrackForm(props: Readonly<TrackFormProps>) {
  const initialDifficulty = resolvedDifficulty(props.defaultDifficulty);
  const defaultAudioUrl = normalizedPath(props.defaultAudioUrl);
  const audioChoices = Array.from(
    new Set(
      [...props.audioChoices, defaultAudioUrl]
        .map((value) => normalizedPath(value))
        .filter((value) => value !== ""),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const defaultIsMissing = defaultAudioUrl !== "" &&
    !props.audioChoices.some((value) =>
      normalizedPath(value) === defaultAudioUrl
    );

  return (
    <PlateauCard class="w-full" padding="5">
      <form
        id={props.formDomId}
        method={props.method ?? "post"}
        action={props.action}
        class="space-y-4"
      >
        <FieldGroup label="Title" htmlFor="tr-title">
          <TrackTitleInput
            id="tr-title"
            initialTitle={props.defaultTitle ?? ""}
          />
        </FieldGroup>
        <FieldGroup label="Audio URL (repo-relative)" htmlFor="tr-audio">
          <TrackAudioPick
            id="tr-audio"
            initialAudioUrl={defaultAudioUrl}
            audioChoices={audioChoices}
          />
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
        <FieldGroup label="Playback start (seconds)" htmlFor="tr-play-start">
          <TextInput
            id="tr-play-start"
            name="playStartSeconds"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={(props.defaultPlayStartSeconds ?? null) === null
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
            defaultValue={(props.defaultMaxPlaySeconds ?? null) === null
              ? ""
              : String(props.defaultMaxPlaySeconds)}
            placeholder={`${DEFAULT_MAX_PLAY_SECONDS}`}
          />
          <p class="text-xs opacity-80">
            Optional. Leave blank for default ({DEFAULT_MAX_PLAY_SECONDS}s,
            includes fade-in/out).
          </p>
        </FieldGroup>
        <RadioGroupField
          legend="Difficulty"
          name="difficulty"
          options={DIFFICULTY_OPTIONS}
          initialValue={initialDifficulty}
          class="space-y-1"
          optionsClass="flex gap-3 pt-1"
        />
        <CheckboxGroupField
          legend="Categories"
          name="categoryIds"
          options={props.categories.map((category) => ({
            value: String(category.id),
            label: category.name,
          }))}
          initialValues={(props.selectedCategoryIds ?? []).map(String)}
        />
        <Button type="submit" variant="success" class="w-full">
          {props.submitLabel}
        </Button>
      </form>
    </PlateauCard>
  );
}
