import { Button } from "../Button.tsx";
import { FieldGroup } from "../ui/FieldGroup.tsx";
import { TextInput } from "../ui/TextInput.tsx";
import type { CategoryRow } from "../../lib/categories.ts";

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
  const selected = new Set(props.selectedCategoryIds ?? []);
  return (
    <form
      method={props.method ?? "post"}
      action={props.action}
      class="plateau rounded-2xl p-5 space-y-4 max-w-lg"
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
      <div class="space-y-1">
        <span class="text-sm font-medium">Difficulty</span>
        <div class="flex gap-3 pt-1">
          {(["easy", "hard"] as const).map((difficulty) => (
            <label
              key={difficulty}
              class="flex items-center gap-2 text-sm capitalize"
            >
              <input
                type="radio"
                name="difficulty"
                value={difficulty}
                defaultChecked={(props.defaultDifficulty ?? "easy") ===
                  difficulty}
              />
              {difficulty}
            </label>
          ))}
        </div>
      </div>
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">Categories</legend>
        <div class="flex flex-col gap-2">
          {props.categories.map((c) => (
            <label key={c.id} class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="categoryIds"
                value={c.id}
                defaultChecked={selected.has(c.id)}
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" variant="success" class="w-full">
        {props.submitLabel}
      </Button>
    </form>
  );
}
