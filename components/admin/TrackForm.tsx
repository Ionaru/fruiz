import TrackCategoriesPick from "../../islands/TrackCategoriesPick.tsx";
import TrackDifficultyPick from "../../islands/TrackDifficultyPick.tsx";
import { Button } from "../Button.tsx";
import { FieldGroup } from "../ui/FieldGroup.tsx";
import { TextInput } from "../ui/TextInput.tsx";
import type { CategoryRow } from "../../lib/categories.ts";

function resolvedDifficulty(
  raw: string | undefined,
): "easy" | "hard" {
  const s = String(raw ?? "easy").trim().toLowerCase();
  return s === "hard" ? "hard" : "easy";
}

export interface TrackFormProps {
  action: string;
  method?: "post";
  categories: CategoryRow[];
  selectedCategoryIds?: string[];
  defaultTitle?: string;
  defaultAudioUrl?: string;
  defaultDifficulty?: "easy" | "hard";
  submitLabel: string;
}

export function TrackForm(props: Readonly<TrackFormProps>) {
  const initialDifficulty = resolvedDifficulty(props.defaultDifficulty);
  return (
    <form
      method={props.method ?? "post"}
      action={props.action}
      class="plateau w-full rounded-2xl p-5 space-y-4"
    >
      <FieldGroup label="Title" htmlFor="tr-title">
        <TextInput
          id="tr-title"
          name="title"
          required
          defaultValue={props.defaultTitle ?? ""}
        />
      </FieldGroup>
      <FieldGroup label="Audio URL (repo-relative)" htmlFor="tr-audio">
        <TextInput
          id="tr-audio"
          name="audioUrl"
          required
          placeholder="static/audio/example.mp3"
          defaultValue={props.defaultAudioUrl ?? ""}
        />
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
