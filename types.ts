export interface Candidate {
  id: string;
  name: string;
  handle: string;
  votes: number;
  color: string;
  previousRank: number; // For trend calculation
  currentRank: number;
}

export interface SimulationConfig {
  isRunning: boolean;
  updateInterval: number; // ms
}