import { Button, type ButtonProps } from "../Button.tsx";

export interface TrackGridButtonProps {
  label: number;
  variant: ButtonProps["variant"];
  isActive: boolean;
  onSelect: () => void;
}

export function TrackGridButton(
  { label, variant, isActive, onSelect }: Readonly<TrackGridButtonProps>,
) {
  return (
    <Button
      class={`min-w-0 aspect-square p-2 text-sm font-medium rounded-xl! ${
        isActive ? "ring-2 ring-base-500 dark:ring-base-300" : ""
      }`}
      variant={variant}
      onClick={onSelect}
    >
      {label}
    </Button>
  );
}
