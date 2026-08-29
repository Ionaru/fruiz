export interface AnswerSuggestionOptionProps {
  id: string;
  title: string;
  isActive: boolean;
  onSelect: () => void;
  onHoverActivate: () => void;
}

export function AnswerSuggestionOption(
  { id, title, isActive, onSelect, onHoverActivate }: Readonly<
    AnswerSuggestionOptionProps
  >,
) {
  const optionClass = [
    "cursor-pointer select-none rounded-lg px-4 min-h-11",
    "flex items-center touch-manipulation",
    isActive ? "bg-base-300 dark:bg-base-700" : "",
  ].filter(Boolean).join(" ");

  return (
    <li
      id={id}
      role="option"
      // Explicit strings, not a boolean: this element is compiled through
      // the JSX precompile path, which renders `aria-selected={true}` as a
      // bare valueless attribute and drops it entirely when false, leaving
      // no option in the listbox reported as the selected one.
      aria-selected={isActive ? "true" : "false"}
      class={optionClass}
      onPointerDown={(event) => {
        event.preventDefault();
      }}
      onClick={onSelect}
      onPointerEnter={onHoverActivate}
    >
      {title}
    </li>
  );
}
