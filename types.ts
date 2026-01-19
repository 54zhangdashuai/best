export interface Candidate {
  id: string;
  name: string;
  handle: string;
  votes: number;
  color: string;
  previousRank: number; // For trend calculation
  currentRank: number;
}

export interface Config {
  vote_count_limit: number;
  voting_enabled: boolean;
  countdown_duration_seconds: number;
  countdown_end_at: number; // Timestamp (ms)
  remaining_seconds: number;
}

export interface SimulationConfig {
  isRunning: boolean;
  updateInterval: number; // ms
}