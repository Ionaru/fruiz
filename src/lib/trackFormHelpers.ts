export function resolvedDifficulty(
  raw: string | undefined,
): "easy" | "hard" {
  const normalized = String(raw ?? "easy").trim().toLowerCase();
  return normalized === "hard" ? "hard" : "easy";
}

export function normalizedPath(value: string | undefined): string {
  return String(value ?? "").trim().replaceAll("\\", "/");
}
