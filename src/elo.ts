import type {
  BusiestDay,
  EloHistoryPoint,
  EloResult,
  FunStats,
  Match,
  PlayerElo,
  PlayerStanding,
  ScorelineHighlight,
  SideRecord,
  UpsetHighlight,
  WinStreak,
} from './types';

export const START_RATING = 1500;
export const K_FACTOR = 32;

export interface MatchupRow {
  opponent: string;
  wins: number;
  losses: number;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function ensurePlayer(ratings: Map<string, number>, name: string): void {
  if (!ratings.has(name)) {
    ratings.set(name, START_RATING);
  }
}

function matchTime(timestamp: string, index: number): number {
  const time = new Date(timestamp).getTime();
  return Number.isNaN(time) ? index : time;
}

function isMoreRecent(
  time: number,
  index: number,
  bestTime: number,
  bestIndex: number
): boolean {
  if (time !== bestTime) return time > bestTime;
  return index > bestIndex;
}

function localDay(timestamp: string): { key: string; label: string; time: number } | null {
  const date = new Date(timestamp);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const label = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return { key, label, time };
}

function sideRecordsFor(
  matchCount: number,
  sides: string[],
  sideWins: Map<string, number>
): SideRecord[] {
  if (matchCount === 0) return [];
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (side: string) => {
    const name = side.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    ordered.push(name);
  };
  for (const side of sides) add(side);
  const extras = [...sideWins.keys()].sort((a, b) => a.localeCompare(b));
  for (const side of extras) add(side);
  return ordered.map((side) => {
    const wins = sideWins.get(side) ?? 0;
    return { side, wins, losses: matchCount - wins };
  });
}

export function matchupsFor(matches: Match[], player: string): MatchupRow[] {
  const rows = new Map<string, { wins: number; losses: number }>();
  for (const match of matches) {
    let opponent = '';
    let won = false;
    if (match.winner === player) {
      opponent = match.loser;
      won = true;
    } else if (match.loser === player) {
      opponent = match.winner;
    } else {
      continue;
    }
    if (!opponent || opponent === player) continue;
    const row = rows.get(opponent) ?? { wins: 0, losses: 0 };
    if (won) row.wins += 1;
    else row.losses += 1;
    rows.set(opponent, row);
  }
  return [...rows.entries()]
    .map(([opponent, record]) => ({ opponent, wins: record.wins, losses: record.losses }))
    .sort((a, b) => {
      const gamesA = a.wins + a.losses;
      const gamesB = b.wins + b.losses;
      if (gamesB !== gamesA) return gamesB - gamesA;
      return a.opponent.localeCompare(b.opponent);
    });
}

export function computeElo(players: string[], matches: Match[], sides: string[] = []): EloResult {
  const ratings = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const pointDiff = new Map<string, number>();

  for (const name of players) {
    ratings.set(name, START_RATING);
    wins.set(name, 0);
    losses.set(name, 0);
    pointDiff.set(name, 0);
  }

  const history: EloHistoryPoint[] = [];
  let blowout: (ScorelineHighlight & { margin: number; time: number; index: number }) | null = null;
  let upset: (UpsetHighlight & { time: number; index: number }) | null = null;
  let sumWinner = 0;
  let sumLoser = 0;
  let scoredGames = 0;
  const sideWins = new Map<string, number>();
  const days = new Map<string, { label: string; games: number; latest: number }>();
  const streak = new Map<string, number>();
  let longestStreak: (WinStreak & { time: number; index: number }) | null = null;

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    ensurePlayer(ratings, match.winner);
    ensurePlayer(ratings, match.loser);
    if (!wins.has(match.winner)) wins.set(match.winner, 0);
    if (!losses.has(match.loser)) losses.set(match.loser, 0);
    if (!pointDiff.has(match.winner)) pointDiff.set(match.winner, 0);
    if (!pointDiff.has(match.loser)) pointDiff.set(match.loser, 0);

    const rw = ratings.get(match.winner)!;
    const rl = ratings.get(match.loser)!;
    const time = matchTime(match.timestamp, index);

    if (rl > rw) {
      const gap = rl - rw;
      if (
        !upset ||
        gap > upset.gap ||
        (gap === upset.gap && isMoreRecent(time, index, upset.time, upset.index))
      ) {
        upset = {
          winner: match.winner,
          loser: match.loser,
          winnerScore: match.winnerScore,
          loserScore: match.loserScore,
          gap,
          time,
          index,
        };
      }
    }

    const ew = expectedScore(rw, rl);
    const el = expectedScore(rl, rw);

    ratings.set(match.winner, Math.round(rw + K_FACTOR * (1 - ew)));
    ratings.set(match.loser, Math.round(rl + K_FACTOR * (0 - el)));

    wins.set(match.winner, (wins.get(match.winner) ?? 0) + 1);
    losses.set(match.loser, (losses.get(match.loser) ?? 0) + 1);

    const margin = match.winnerScore - match.loserScore;
    if (Number.isFinite(margin)) {
      pointDiff.set(match.winner, (pointDiff.get(match.winner) ?? 0) + margin);
      pointDiff.set(match.loser, (pointDiff.get(match.loser) ?? 0) - margin);
      sumWinner += match.winnerScore;
      sumLoser += match.loserScore;
      scoredGames += 1;
      if (
        !blowout ||
        margin > blowout.margin ||
        (margin === blowout.margin && isMoreRecent(time, index, blowout.time, blowout.index))
      ) {
        blowout = {
          winner: match.winner,
          loser: match.loser,
          winnerScore: match.winnerScore,
          loserScore: match.loserScore,
          margin,
          time,
          index,
        };
      }
    }

    const side = match.winnerSide.trim();
    if (side) sideWins.set(side, (sideWins.get(side) ?? 0) + 1);

    const day = localDay(match.timestamp);
    if (day) {
      const bucket = days.get(day.key) ?? { label: day.label, games: 0, latest: day.time };
      bucket.games += 1;
      if (day.time > bucket.latest) bucket.latest = day.time;
      days.set(day.key, bucket);
    }

    if (match.winner) {
      const next = (streak.get(match.winner) ?? 0) + 1;
      streak.set(match.winner, next);
      if (
        !longestStreak ||
        next > longestStreak.games ||
        (next === longestStreak.games &&
          isMoreRecent(time, index, longestStreak.time, longestStreak.index))
      ) {
        longestStreak = { name: match.winner, games: next, time, index };
      }
    }
    if (match.loser) streak.set(match.loser, 0);

    const snapshot: Record<string, number> = {};
    for (const [name, rating] of ratings) {
      snapshot[name] = rating;
    }
    history.push({
      matchIndex: index,
      timestamp: match.timestamp,
      ratings: snapshot,
    });
  }

  const rankings: PlayerElo[] = [...ratings.entries()]
    .map(([name, rating]) => ({ name, rating }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));

  const allNames = new Set([...players, ...ratings.keys()]);
  const standings: PlayerStanding[] = [...allNames]
    .map((name) => ({
      name,
      wins: wins.get(name) ?? 0,
      losses: losses.get(name) ?? 0,
      pointDiff: pointDiff.get(name) ?? 0,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const rateA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
      const rateB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
      if (rateB !== rateA) return rateB - rateA;
      return a.name.localeCompare(b.name);
    });

  let busiestDay: (BusiestDay & { latest: number }) | null = null;
  for (const bucket of days.values()) {
    if (
      !busiestDay ||
      bucket.games > busiestDay.games ||
      (bucket.games === busiestDay.games && bucket.latest > busiestDay.latest)
    ) {
      busiestDay = { label: bucket.label, games: bucket.games, latest: bucket.latest };
    }
  }

  const funStats: FunStats = {
    sideRecords: sideRecordsFor(matches.length, sides, sideWins),
    blowout: blowout
      ? {
          winner: blowout.winner,
          loser: blowout.loser,
          winnerScore: blowout.winnerScore,
          loserScore: blowout.loserScore,
        }
      : null,
    upset: upset
      ? {
          winner: upset.winner,
          loser: upset.loser,
          winnerScore: upset.winnerScore,
          loserScore: upset.loserScore,
          gap: upset.gap,
        }
      : null,
    averageWinnerScore: scoredGames > 0 ? sumWinner / scoredGames : null,
    averageLoserScore: scoredGames > 0 ? sumLoser / scoredGames : null,
    busiestDay: busiestDay ? { label: busiestDay.label, games: busiestDay.games } : null,
    longestStreak: longestStreak
      ? { name: longestStreak.name, games: longestStreak.games }
      : null,
  };

  return { rankings, standings, history, funStats };
}
