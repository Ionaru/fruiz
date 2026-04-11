export type DifficultyMode = "easy" | "hard" | "mixed";

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
  /** dB toward ~-16 LUFS; null if not measured. */
  playbackGainDb: number | null;
}
