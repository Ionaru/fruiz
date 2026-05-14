import { Button, type ButtonProps } from "../Button.tsx";

export interface TrackIndicatorButtonProps {
  variant: ButtonProps["variant"];
  isActive: boolean;
  onSelect: () => void;
}

export function TrackIndicatorButton(
  { variant, isActive, onSelect }: Readonly<TrackIndicatorButtonProps>,
) {
  return (
    <Button
      type="button"
      class={`h-12 p-0! m-0.25 xs:m-0.5 ${
        isActive ? "ring-2 ring-base-500 dark:ring-base-300" : ""
      }`}
      variant={variant}
      onClick={onSelect}
    />
  );
}
