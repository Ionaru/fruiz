import { useSignal, useSignalEffect } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { decodeSlug } from "../lib/slug.ts";
import { STORAGE_KEY_PREFIX } from "../lib/quizProgress.ts";
import type { QuizProgress } from "../lib/types.ts";

interface InProgressQuizEntry {
  storageKey: string;
  quizPath: string;
  category: string;
  slug: string;
  difficulty: string;
  answered: number;
  total: number;
}

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
          <li
            key={entry.storageKey}
            class="plateau rounded-xl px-3 py-3 space-y-3"
          >
            <div class="text-sm space-y-1 wrap-break-word">
              <p class="font-medium capitalize">{entry.category}</p>
              <p class="opacity-90">
                Difficulty: <span class="capitalize">{entry.difficulty}</span>
              </p>
              <p class="opacity-90">
                Progress: {entry.answered}/{entry.total}
              </p>
              <p class="opacity-80">Quiz code: {entry.slug}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                variant="info"
                class="px-3 py-2 text-sm"
                onClick={() => onResume(entry.quizPath)}
              >
                Resume
              </Button>
              <Button
                variant="success"
                class="px-3 py-2 text-sm"
                onClick={() => void onShare(entry.quizPath)}
              >
                Share
              </Button>
              <Button
                variant="danger"
                class="px-3 py-2 text-sm"
                onClick={() => onDelete(entry.storageKey)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
