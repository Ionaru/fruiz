export type ProgressTone = "success" | "danger" | "warning" | "info";

export interface ProgressBarProps {
  /** Completed units. Clamped into `0..max` before it is drawn. */
  value: number;
  /** Total units. A non-positive total renders an empty bar rather than dividing by zero. */
  max: number;
  /** Accessible name, e.g. "Nintendo collection progress". */
  label: string;
  tone?: ProgressTone;
  class?: string;
}

const fillClass: Record<ProgressTone, string> = {
  success: "bg-green-400",
  danger: "bg-red-400",
  warning: "bg-yellow-400",
  info: "bg-blue-400",
};

function percentComplete(value: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 0;
  const clamped = Math.min(Math.max(value, 0), max);
  return (clamped / max) * 100;
}

/**
 * Hairline progress indicator used for collection completeness on the menu and
 * for answered-question progress on a resumable quiz. The track is deliberately
 * darker than the plateau it sits on in both colour schemes, so the bar reads as
 * a recess rather than another raised surface.
 */
export function ProgressBar(props: Readonly<ProgressBarProps>) {
  const { value, max, label, tone = "info" } = props;
  const percent = percentComplete(value, max);
  const classes = [
    "h-[3px] overflow-hidden rounded-full bg-base-300 dark:bg-base-950/65",
    props.class,
  ].filter(Boolean).join(" ");
  return (
    <div
      class={classes}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        class={`h-full rounded-full ${fillClass[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
