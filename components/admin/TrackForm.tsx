import { Button } from "../Button.tsx";
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
      <div class="space-y-1">
        <label class="text-sm font-medium" for="tr-title">Title</label>
        <input
          id="tr-title"
          name="title"
          required
          class="plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base-900 dark:text-base-100"
          defaultValue={props.defaultTitle ?? ""}
        />
      </div>
      <div class="space-y-1">
        <label class="text-sm font-medium" for="tr-audio">
          Audio URL (repo-relative)
        </label>
        <input
          id="tr-audio"
          name="audioUrl"
          required
          placeholder="static/audio/example.mp3"
          class="plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base-900 dark:text-base-100"
          defaultValue={props.defaultAudioUrl ?? ""}
        />
      </div>
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
