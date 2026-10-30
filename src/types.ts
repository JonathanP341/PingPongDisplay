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
  pointDiff: number;
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

export interface ScorelineHighlight {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
}

export interface UpsetHighlight extends ScorelineHighlight {
  gap: number;
}

export interface SideRecord {
  side: string;
  wins: number;
  losses: number;
}

export interface BusiestDay {
  label: string;
  games: number;
}

export interface WinStreak {
  name: string;
  games: number;
}

export interface FunStats {
  sideRecords: SideRecord[];
  blowout: ScorelineHighlight | null;
  upset: UpsetHighlight | null;
  averageWinnerScore: number | null;
  averageLoserScore: number | null;
  busiestDay: BusiestDay | null;
  longestStreak: WinStreak | null;
}

export interface EloResult {
  rankings: PlayerElo[];
  standings: PlayerStanding[];
  history: EloHistoryPoint[];
  funStats: FunStats;
}
