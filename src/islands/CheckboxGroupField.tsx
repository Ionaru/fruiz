import { useSignal } from "@preact/signals";
import { CheckControl } from "../components/ui/CheckControl.tsx";
import { CheckGroup } from "../components/ui/CheckGroup.tsx";

export interface CheckboxOption {
  value: string;
  label: string;
}

export interface CheckboxGroupFieldProps {
  legend: string;
  name: string;
  options: readonly CheckboxOption[];
  initialValues: readonly string[];
  class?: string;
  optionsClass?: string;
}

export default function CheckboxGroupField(
  props: Readonly<CheckboxGroupFieldProps>,
) {
  const selectedValues = useSignal<string[]>([...props.initialValues]);

  const setOptionChecked = (value: string, checked: boolean) => {
    const nextValues = new Set(selectedValues.value);
    if (checked) {
      nextValues.add(value);
    } else {
      nextValues.delete(value);
    }
    selectedValues.value = [...nextValues];
  };

  return (
    <CheckGroup
      legend={props.legend}
      class={props.class}
      optionsClass={props.optionsClass}
    >
      {props.options.map((option) => (
        <CheckControl
          key={option.value}
          type="checkbox"
          name={props.name}
          value={option.value}
          checked={selectedValues.value.includes(option.value)}
          onInput={(event) => {
            const inputElement = event.currentTarget as HTMLInputElement;
            setOptionChecked(option.value, inputElement.checked);
          }}
          label={option.label}
        />
      ))}
    </CheckGroup>
  );
}
