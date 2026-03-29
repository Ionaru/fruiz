import { Button } from "../Button.tsx";
import { FieldGroup } from "../ui/FieldGroup.tsx";
import { TextInput } from "../ui/TextInput.tsx";

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
      <FieldGroup label="Name" htmlFor="cat-name">
        <TextInput
          id="cat-name"
          name="name"
          required
          defaultValue={props.defaultName ?? ""}
        />
      </FieldGroup>
      <FieldGroup label="Slug" htmlFor="cat-slug">
        <TextInput
          id="cat-slug"
          name="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Lowercase letters, numbers, and hyphens"
          defaultValue={props.defaultSlug ?? ""}
        />
      </FieldGroup>
      <Button type="submit" variant="success" class="w-full">
        {props.submitLabel}
      </Button>
    </form>
  );
}
