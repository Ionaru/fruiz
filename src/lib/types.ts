export type DifficultyMode = "easy" | "hard" | "mixed";

export interface QuizIdentity {
  categorySlug: string;
  difficulty: DifficultyMode;
  seed: string;
}

export interface QuizSettings {
  replayLimit: number;
}

export type TrackStatus = "unanswered" | "skipped" | "correct" | "incorrect";

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
  audioUrl: string;
  difficulty: "easy" | "hard";
}
