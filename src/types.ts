export interface Match {
  timestamp: string;
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerSide: string;
}

export interface ApiData {
  ok: true;
  players: string[];
  matches: Match[];
  sides: string[];
}

export interface SubmitMatchPayload {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerSide: string;
  passcode?: string;
}

export interface PlayerStanding {
  name: string;
  wins: number;
  losses: number;
}

export interface PlayerElo {
  name: string;
  rating: number;
}

export interface EloHistoryPoint {
  matchIndex: number;
  timestamp: string;
  ratings: Record<string, number>;
}

export interface EloResult {
  rankings: PlayerElo[];
  standings: PlayerStanding[];
  history: EloHistoryPoint[];
}
