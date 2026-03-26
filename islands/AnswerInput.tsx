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
  return (
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium" for={`answer-${props.instanceId}`}>
        Your answer
      </label>
      <input
        id={`answer-${props.instanceId}`}
        class="plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent"
        type="text"
        list={listId}
        value={props.value}
        disabled={props.disabled}
        autocomplete="off"
        aria-describedby={props.ariaDescribedBy}
        onInput={(event) =>
          props.onValue((event.currentTarget as HTMLInputElement).value)}
      />
      <datalist id={listId}>
        {props.suggestions.map((title) => <option key={title} value={title} />)}
      </datalist>
    </div>
  );
}
