export const DEFAULT_WINNER_SCORE = 11;
export const DEFAULT_LOSER_SCORE = 9;
export const MAX_WINNER_SCORE = 30;

/** Loser score for a given winner under win-by-2 rules. */
export function loserScoreForWinner(winnerScore: number): number {
  if (winnerScore === 11) return DEFAULT_LOSER_SCORE;
  return winnerScore - 2;
}

export function winnerScoreOptions(): number[] {
  const opts: number[] = [];
  for (let n = 11; n <= MAX_WINNER_SCORE; n++) opts.push(n);
  return opts;
}

export function loserScoreOptions(winnerScore: number): number[] {
  if (winnerScore === 11) {
    const opts: number[] = [];
    for (let n = 0; n <= 9; n++) opts.push(n);
    return opts;
  }
  return [winnerScore - 2];
}

export function isValidScorePair(winnerScore: number, loserScore: number): boolean {
  if (!Number.isInteger(winnerScore) || !Number.isInteger(loserScore)) return false;
  if (winnerScore < 11 || winnerScore > MAX_WINNER_SCORE) return false;
  if (loserScore < 0 || winnerScore <= loserScore) return false;
  if (winnerScore === 11) return loserScore <= 9;
  return loserScore === winnerScore - 2;
}
