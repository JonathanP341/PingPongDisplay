import type { EloHistoryPoint, EloResult, Match, PlayerElo, PlayerStanding } from './types';

export const START_RATING = 1500;
export const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function ensurePlayer(ratings: Map<string, number>, name: string): void {
  if (!ratings.has(name)) {
    ratings.set(name, START_RATING);
  }
}

export function computeElo(players: string[], matches: Match[]): EloResult {
  const ratings = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();

  for (const name of players) {
    ratings.set(name, START_RATING);
    wins.set(name, 0);
    losses.set(name, 0);
  }

  const history: EloHistoryPoint[] = [];

  matches.forEach((match, index) => {
    ensurePlayer(ratings, match.winner);
    ensurePlayer(ratings, match.loser);
    if (!wins.has(match.winner)) wins.set(match.winner, 0);
    if (!losses.has(match.loser)) losses.set(match.loser, 0);

    const rw = ratings.get(match.winner)!;
    const rl = ratings.get(match.loser)!;
    const ew = expectedScore(rw, rl);
    const el = expectedScore(rl, rw);

    ratings.set(match.winner, Math.round(rw + K_FACTOR * (1 - ew)));
    ratings.set(match.loser, Math.round(rl + K_FACTOR * (0 - el)));

    wins.set(match.winner, (wins.get(match.winner) ?? 0) + 1);
    losses.set(match.loser, (losses.get(match.loser) ?? 0) + 1);

    const snapshot: Record<string, number> = {};
    for (const [name, rating] of ratings) {
      snapshot[name] = rating;
    }
    history.push({
      matchIndex: index,
      timestamp: match.timestamp,
      ratings: snapshot,
    });
  });

  const rankings: PlayerElo[] = [...ratings.entries()]
    .map(([name, rating]) => ({ name, rating }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));

  const allNames = new Set([...players, ...ratings.keys()]);
  const standings: PlayerStanding[] = [...allNames]
    .map((name) => ({
      name,
      wins: wins.get(name) ?? 0,
      losses: losses.get(name) ?? 0,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const rateA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
      const rateB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
      if (rateB !== rateA) return rateB - rateA;
      return a.name.localeCompare(b.name);
    });

  return { rankings, standings, history };
}
