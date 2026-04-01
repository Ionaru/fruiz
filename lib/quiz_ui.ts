import type { TrackStatus } from "./types.ts";

export function variantForStatus(
  status: TrackStatus,
): "success" | "danger" | "warning" | undefined {
  switch (status) {
    case "correct":
      return "success";
    case "incorrect":
      return "danger";
    case "skipped":
      return "warning";
    default:
      return undefined;
  }
}
