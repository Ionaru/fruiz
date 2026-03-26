import { Button } from "../Button.tsx";

export interface CategoryFormProps {
  action: string;
  method?: "post";
  defaultName?: string;
  defaultSlug?: string;
  submitLabel: string;
}

export function CategoryForm(props: Readonly<CategoryFormProps>) {
  return (
    <form
      method={props.method ?? "post"}
      action={props.action}
      class="plateau rounded-2xl p-5 space-y-4 max-w-md"
    >
      <div class="space-y-1">
        <label class="text-sm font-medium" for="cat-name">Name</label>
        <input
          id="cat-name"
          name="name"
          required
          class="plateau rounded-xl px-3 py-2 w-full border-0 bg-transparent"
          defaultValue={props.defaultName ?? ""}
        />
      </div>
      <div class="space-y-1">
        <label class="text-sm font-medium" for="cat-slug">Slug</label>
        <input
          id="cat-slug"
          name="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Lowercase letters, numbers, and hyphens"
          class="plateau rounded-xl px-3 py-2 w-full border-0 bg-transparent"
          defaultValue={props.defaultSlug ?? ""}
        />
      </div>
      <Button type="submit" variant="success" class="w-full">
        {props.submitLabel}
      </Button>
    </form>
  );
}
