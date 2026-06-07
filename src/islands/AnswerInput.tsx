import { useSignal, useSignalEffect } from "@preact/signals";
import { AnswerSuggestionOption } from "../components/quiz/AnswerSuggestionOption.tsx";
import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";
import { suggestMatches } from "../lib/guess_match.ts";

interface AnswerInputProps {
  instanceId: string;
  suggestions: string[];
  value: string;
  disabled?: boolean;
  /** Field label; defaults to "Your answer" for the quiz. */
  label?: string;
  /** Optional id of helper text for screen readers (e.g. submit gating hint). */
  ariaDescribedBy?: string;
  onValue: (value: string) => void;
}

const MAX_MATCHES = 20;

export default function AnswerInput(props: Readonly<AnswerInputProps>) {
  const inputId = `answer-${props.instanceId}`;
  const listboxId = `answer-listbox-${props.instanceId}`;
  const optionId = (index: number) => `${listboxId}-opt-${index}`;

  const isOpen = useSignal(false);
  const activeIndex = useSignal(-1);
  const containerEl = useSignal<HTMLDivElement | null>(null);
  const listboxEl = useSignal<HTMLUListElement | null>(null);

  useSignalEffect(() => {
    if (!isOpen.value) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = containerEl.value;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      isOpen.value = false;
      activeIndex.value = -1;
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  });

  useSignalEffect(() => {
    if (!isOpen.value) return;
    const index = activeIndex.value;
    if (index < 0) return;
    const list = listboxEl.value;
    if (!list) return;
    const option = list.children.item(index) as HTMLElement | null;
    option?.scrollIntoView({ block: "nearest" });
  });

  const matches = suggestMatches(props.value, props.suggestions, MAX_MATCHES);
  const expanded = isOpen.value && matches.length > 0;
  const currentActive = activeIndex.value;

  const selectAt = (index: number) => {
    const title = matches[index];
    if (title === undefined) return;
    props.onValue(title);
    isOpen.value = false;
    activeIndex.value = -1;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (props.disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (matches.length === 0) return;
      if (!isOpen.value) isOpen.value = true;
      activeIndex.value = (currentActive + 1) % matches.length;
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (matches.length === 0) return;
      if (!isOpen.value) isOpen.value = true;
      activeIndex.value = currentActive <= 0
        ? matches.length - 1
        : currentActive - 1;
      return;
    }
    if (event.key === "Enter") {
      if (isOpen.value && currentActive >= 0) {
        event.preventDefault();
        selectAt(currentActive);
      }
      return;
    }
    if (event.key === "Escape") {
      if (isOpen.value) {
        event.preventDefault();
        isOpen.value = false;
        activeIndex.value = -1;
      }
      return;
    }
    if (event.key === "Tab") {
      isOpen.value = false;
      activeIndex.value = -1;
    }
  };

  const onInput = (event: Event) => {
    const nextValue = (event.currentTarget as HTMLInputElement).value;
    props.onValue(nextValue);
    activeIndex.value = -1;
    isOpen.value = nextValue.trim() !== "";
  };

  const onFocus = () => {
    if (props.disabled) return;
    if (props.value.trim() === "") return;
    isOpen.value = true;
  };

  const activeDescendant = expanded && currentActive >= 0
    ? optionId(currentActive)
    : undefined;

  return (
    <div
      class="flex flex-col gap-2"
      ref={(element) => {
        containerEl.value = element;
      }}
    >
      <FieldGroup label={props.label ?? "Your answer"} htmlFor={inputId} center>
        <div class="relative">
          <TextInput
            class="text-center"
            id={inputId}
            type="text"
            value={props.value}
            disabled={props.disabled}
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-describedby={props.ariaDescribedBy}
            onInput={onInput}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
          />
          {expanded && (
            <ul
              ref={(element) => {
                listboxEl.value = element;
              }}
              id={listboxId}
              role="listbox"
              aria-label="Title suggestions"
              class="absolute left-0 right-0 top-full mt-2 z-20 plateau rounded-xl p-1 max-h-60 overflow-y-auto overscroll-contain text-left"
            >
              {matches.map((title, index) => (
                <AnswerSuggestionOption
                  key={`${title}-${index}`}
                  id={optionId(index)}
                  title={title}
                  isActive={index === currentActive}
                  onSelect={() => {
                    selectAt(index);
                  }}
                  onHoverActivate={() => {
                    activeIndex.value = index;
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </FieldGroup>
    </div>
  );
}
