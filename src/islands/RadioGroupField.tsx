import { useSignal } from "@preact/signals";
import { CheckControl } from "../components/ui/CheckControl.tsx";
import { CheckGroup } from "../components/ui/CheckGroup.tsx";

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupFieldProps {
  legend: string;
  name: string;
  options: readonly RadioOption[];
  initialValue: string;
  class?: string;
  optionsClass?: string;
}

export default function RadioGroupField(
  props: Readonly<RadioGroupFieldProps>,
) {
  const selectedValue = useSignal(props.initialValue);

  return (
    <CheckGroup
      legend={props.legend}
      class={props.class}
      optionsClass={props.optionsClass}
    >
      {props.options.map((option) => (
        <CheckControl
          key={option.value}
          type="radio"
          name={props.name}
          value={option.value}
          checked={selectedValue.value === option.value}
          onInput={() => {
            selectedValue.value = option.value;
          }}
          label={option.label}
          class="capitalize"
        />
      ))}
    </CheckGroup>
  );
}
