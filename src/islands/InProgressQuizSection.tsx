import { useSignal, useSignalEffect } from "@preact/signals";
import { InProgressQuizItem } from "../components/quiz/InProgressQuizItem.tsx";
import { decodeSlug } from "../lib/slug.ts";
import { STORAGE_KEY_PREFIX } from "../lib/quizProgress.ts";
import type { InProgressQuizEntry, QuizProgress } from "../lib/types.ts";

function parseQuizPathParts(
  quizPath: string,
): { category: string; slug: string } | null {
  const parts = quizPath.split("/").filter(Boolean);
  const category = parts[1];
  const slug = parts.at(-1);
  if (!slug || !category || parts[0] !== "quiz") return null;
  return { category, slug };
}

function isInProgressQuiz(progress: QuizProgress): boolean {
  const hasStarted = progress.tracks.some((entry) =>
    entry.status !== "unanswered"
  );
  const isFinalized = progress.tracks.every(
    (entry) => entry.status === "correct" || entry.status === "incorrect",
  );
  return hasStarted && !isFinalized;
}

function answeredFromTracks(progress: QuizProgress): number {
  return progress.tracks.filter((entry) =>
    entry.status === "correct" || entry.status === "incorrect"
  ).length;
}

function buildEntry(
  storageKey: string,
  rawValue: string,
): InProgressQuizEntry | null {
  let parsed: QuizProgress;
  try {
    parsed = JSON.parse(rawValue) as QuizProgress;
  } catch {
    return null;
  }

  if (
    typeof parsed.quizPath !== "string" ||
    !Array.isArray(parsed.tracks) ||
    parsed.tracks.length === 0
  ) {
    return null;
  }

  if (!isInProgressQuiz(parsed)) return null;
  const pathParts = parseQuizPathParts(parsed.quizPath);
  if (!pathParts) return null;
  const decoded = decodeSlug(pathParts.slug);
  if (!decoded) return null;

  return {
    storageKey,
    quizPath: parsed.quizPath,
    category: pathParts.category,
    slug: pathParts.slug,
    difficulty: decoded.difficulty,
    answered: answeredFromTracks(parsed),
    total: parsed.tracks.length,
  };
}

function readInProgressEntries(): InProgressQuizEntry[] {
  const entries: InProgressQuizEntry[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(STORAGE_KEY_PREFIX)) continue;
    const rawValue = localStorage.getItem(key);
    if (!rawValue) continue;
    const entry = buildEntry(key, rawValue);
    if (entry) entries.push(entry);
  }
  return entries.sort((left, right) =>
    left.quizPath.localeCompare(right.quizPath)
  );
}

export default function InProgressQuizSection() {
  const entries = useSignal<InProgressQuizEntry[]>([]);
  const refreshCounter = useSignal(0);

  useSignalEffect(() => {
    refreshCounter.value;
    try {
      entries.value = readInProgressEntries();
    } catch {
      entries.value = [];
    }
  });

  const onResume = (quizPath: string) => {
    globalThis.location.assign(quizPath);
  };

  const onDelete = (storageKey: string) => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    refreshCounter.value += 1;
  };

  const onShare = async (quizPath: string) => {
    const shareUrl = new URL(quizPath, globalThis.location.origin).toString();
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  };

  if (entries.value.length === 0) return null;

  return (
    <div class="space-y-3">
      <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
        Resume quiz
      </h2>
      <ul class="space-y-3">
        {entries.value.map((entry) => (
          <InProgressQuizItem
            key={entry.storageKey}
            entry={entry}
            onResume={onResume}
            onDelete={onDelete}
            onShare={(quizPath) => void onShare(quizPath)}
          />
        ))}
      </ul>
    </div>
  );
}
