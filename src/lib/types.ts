export type DifficultyMode = "easy" | "hard";

export interface InProgressQuizEntry {
  storageKey: string;
  quizPath: string;
  category: string;
  slug: string;
  difficulty: string;
  answered: number;
  total: number;
}

export interface QuizIdentity {
  categorySlug: string;
  difficulty: DifficultyMode;
  code: string;
}

export interface QuizSettings {
  replayLimit: number;
}

export type TrackStatus =
  | "unanswered"
  | "skipped"
  | "correct"
  | "incorrect"
  | "unavailable";

export interface QuizProgressTrack {
  trackId: string;
  status: TrackStatus;
  selectedTitle: string | null;
  replayCount: number;
}

export interface QuizProgress {
  quizPath: string;
  score: number;
  tracks: QuizProgressTrack[];
}

export interface QuizTrackPayload {
  id: string;
  title: string;
  audioUrl: string | null;
  difficulty: "easy" | "hard";
  unavailable: boolean;
  /** Full-track dB toward ~-16 LUFS; null if not measured. */
  playbackGainDb: number | null;
  /** Clip-window dB toward ~-16 LUFS; null if not measured. The quiz applies this. */
  clipPlaybackGainDb: number | null;
  /** Resolved start offset in seconds (>= 0). */
  playStartSeconds: number;
  /** Resolved max clip length in seconds (includes fade-in/out). */
  maxPlaySeconds: number;
  /** Byte size of the audio file when gain was last computed or fingerprint seeded. */
  playbackGainSourceSize: number | null;
  /** mtime of the audio file in ms since epoch; null if unknown. */
  playbackGainSourceMtimeMs: number | null;
}
