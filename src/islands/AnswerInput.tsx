import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";

interface AnswerInputProps {
  instanceId: string;
  suggestions: string[];
  value: string;
  disabled?: boolean;
  /** Optional id of helper text for screen readers (e.g. submit gating hint). */
  ariaDescribedBy?: string;
  onValue: (value: string) => void;
}

export default function AnswerInput(props: Readonly<AnswerInputProps>) {
  const listId = `quiz-titles-${props.instanceId}`;
  const inputId = `answer-${props.instanceId}`;
  return (
    <div class="flex flex-col gap-2">
      <FieldGroup label="Your answer" htmlFor={inputId} center>
        <TextInput
          class="text-center"
          id={inputId}
          type="text"
          list={listId}
          value={props.value}
          disabled={props.disabled}
          autocomplete="off"
          onInput={(event) =>
            props.onValue((event.currentTarget as HTMLInputElement).value)}
        />
      </FieldGroup>
      <datalist id={listId}>
        {props.suggestions.map((title) => <option key={title} value={title} />)}
      </datalist>
    </div>
  );
}
