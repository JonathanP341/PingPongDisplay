import { computeElo, matchupsFor } from '../elo';
import type { ApiData, EloHistoryPoint, FunStats, Match } from '../types';

export interface StatsView {
  el: HTMLElement;
  refresh: (data: ApiData) => void;
}

const CHART_COLORS = [
  '#FC4C02',
  '#F2F2F4',
  '#A7A7B2',
  '#FF8A4C',
  '#C8C8D0',
  '#FF6B35',
  '#8E8E9A',
  '#E0A080',
];

function renderEloChart(history: EloHistoryPoint[], playerNames: string[]): string {
  if (history.length === 0 || playerNames.length === 0) {
    return '<p class="chart-empty">Play some games to see rating trends.</p>';
  }

  const width = 320;
  const height = 160;
  const pad = { top: 8, right: 8, bottom: 24, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allRatings: number[] = [];
  for (const pt of history) {
    for (const name of playerNames) {
      const r = pt.ratings[name];
      if (r != null) allRatings.push(r);
    }
  }
  let minR = Math.min(...allRatings, 1400);
  let maxR = Math.max(...allRatings, 1600);
  if (maxR - minR < 80) {
    const mid = (maxR + minR) / 2;
    minR = mid - 40;
    maxR = mid + 40;
  }

  const xAt = (i: number) =>
    pad.left + (history.length <= 1 ? innerW / 2 : (i / (history.length - 1)) * innerW);
  const yAt = (r: number) => pad.top + innerH - ((r - minR) / (maxR - minR)) * innerH;

  const lines = playerNames
    .map((name, idx) => {
      const color = CHART_COLORS[idx % CHART_COLORS.length];
      const points: string[] = [];
      history.forEach((pt, i) => {
        const r = pt.ratings[name];
        if (r != null) points.push(`${xAt(i)},${yAt(r)}`);
      });
      if (points.length < 2) return '';
      return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${points.join(' ')}" />`;
    })
    .join('');

  const yTicks = [minR, Math.round((minR + maxR) / 2), maxR];

  return `
    <svg class="elo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="ELO over time">
      ${yTicks
        .map(
          (t) =>
            `<text x="${pad.left - 4}" y="${yAt(t) + 4}" text-anchor="end" class="chart-axis">${t}</text>`
        )
        .join('')}
      ${lines}
    </svg>
    <ul class="chart-legend">
      ${playerNames
        .slice(0, 8)
        .map(
          (name, idx) =>
            `<li><span class="chart-legend__swatch" style="background:${CHART_COLORS[idx % CHART_COLORS.length]}"></span>${escapeHtml(name)}</li>`
        )
        .join('')}
    </ul>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function formatDiff(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function diffClass(n: number): string {
  if (n > 0) return 'standings-diff is-positive';
  if (n < 0) return 'standings-diff is-negative';
  return 'standings-diff';
}

function playerChoices(players: string[], matches: Match[]): string[] {
  const names = new Set<string>();
  for (const name of players) {
    if (name) names.add(name);
  }
  for (const match of matches) {
    if (match.winner) names.add(match.winner);
    if (match.loser) names.add(match.loser);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function renderMatchupBody(matches: Match[], player: string): string {
  if (!player) return '';
  const rows = matchupsFor(matches, player);
  if (rows.length === 0) {
    return '<p class="empty-hint matchup-empty">No games yet.</p>';
  }
  return `<ul class="matchup-list">${rows
    .map((row) => {
      const games = row.wins + row.losses;
      const rate = Math.round((row.wins / games) * 100);
      return `<li class="matchup-row"><span class="matchup-row__name">${escapeHtml(row.opponent)}</span><span class="matchup-row__rate">${rate}%</span><span class="matchup-row__record">${row.wins}-${row.losses}</span></li>`;
    })
    .join('')}</ul>`;
}

function gamesLabel(count: number): string {
  return count === 1 ? '1 game' : `${count} games`;
}

function emptyStat(): string {
  return '<p class="fun-stat__value empty-hint">No games yet.</p>';
}

function statBlock(label: string, valueHtml: string): string {
  return `<section class="fun-stat"><h3 class="fun-stat__label">${label}</h3>${valueHtml}</section>`;
}

function sidePercent(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

function scoreboard(options: {
  leftName: string;
  leftScore: string;
  rightName: string;
  rightScore: string;
  lead: 'left' | 'right' | 'tie';
  caption?: string;
}): string {
  const leftLead = options.lead === 'left' ? ' scoreboard__score--lead' : '';
  const rightLead = options.lead === 'right' ? ' scoreboard__score--lead' : '';
  const leftTrail = options.lead === 'right' ? ' scoreboard__score--trail' : '';
  const rightTrail = options.lead === 'left' ? ' scoreboard__score--trail' : '';
  const caption = options.caption
    ? `<p class="scoreboard__caption">${escapeHtml(options.caption)}</p>`
    : '';
  return `<div class="scoreboard">
      <span class="scoreboard__name scoreboard__name--left">${escapeHtml(options.leftName)}</span>
      <span class="scoreboard__score${leftLead}${leftTrail}">${escapeHtml(options.leftScore)}</span>
      <span class="scoreboard__colon" aria-hidden="true">:</span>
      <span class="scoreboard__score${rightLead}${rightTrail}">${escapeHtml(options.rightScore)}</span>
      <span class="scoreboard__name scoreboard__name--right">${escapeHtml(options.rightName)}</span>
    </div>${caption}`;
}

function renderSideScore(stats: FunStats): string {
  const sides = stats.sideRecords;
  if (sides.length < 2) {
    if (sides.length === 0) return emptyStat();
    const only = sides[0];
    return `<p class="fun-stat__value">${escapeHtml(only.side)} ${sidePercent(only.wins, only.losses)}%</p>`;
  }
  const [left, right] = sides;
  const leftPct = sidePercent(left.wins, left.losses);
  const rightPct = sidePercent(right.wins, right.losses);
  const lead = leftPct === rightPct ? 'tie' : leftPct > rightPct ? 'left' : 'right';
  const board = scoreboard({
    leftName: left.side,
    leftScore: `${leftPct}%`,
    rightName: right.side,
    rightScore: `${rightPct}%`,
    lead,
  });
  const extras = sides
    .slice(2)
    .map(
      (side) =>
        `<p class="fun-stat__value">${escapeHtml(side.side)} ${sidePercent(side.wins, side.losses)}%</p>`
    )
    .join('');
  return board + extras;
}

function highlightTile(label: string, value: string, detail: string): string {
  if (!value) {
    return `<section class="fun-tile"><h3 class="fun-stat__label">${label}</h3>${emptyStat()}</section>`;
  }
  return `<section class="fun-tile"><h3 class="fun-stat__label">${label}</h3><p class="fun-tile__value">${escapeHtml(value)}</p><p class="fun-tile__detail">${escapeHtml(detail)}</p></section>`;
}

function renderFunStats(stats: FunStats, matchCount: number): string {
  const noGames = matchCount === 0;
  const sideValue = noGames ? emptyStat() : renderSideScore(stats);

  const blowout = stats.blowout
    ? scoreboard({
        leftName: stats.blowout.winner,
        leftScore: String(stats.blowout.winnerScore),
        rightName: stats.blowout.loser,
        rightScore: String(stats.blowout.loserScore),
        lead: 'left',
      })
    : emptyStat();

  const upset = stats.upset
    ? scoreboard({
        leftName: stats.upset.winner,
        leftScore: String(stats.upset.winnerScore),
        rightName: stats.upset.loser,
        rightScore: String(stats.upset.loserScore),
        lead: 'left',
        caption: `${stats.upset.gap} ELO`,
      })
    : noGames
      ? emptyStat()
      : '<p class="fun-stat__value empty-hint">No upsets yet.</p>';

  const average =
    stats.averageWinnerScore != null && stats.averageLoserScore != null
      ? scoreboard({
          leftName: 'Won',
          leftScore: stats.averageWinnerScore.toFixed(1),
          rightName: 'Lost',
          rightScore: stats.averageLoserScore.toFixed(1),
          lead: 'left',
        })
      : emptyStat();

  const day = stats.busiestDay
    ? highlightTile('Busiest day', stats.busiestDay.label, gamesLabel(stats.busiestDay.games))
    : highlightTile('Busiest day', '', '');

  const streak = stats.longestStreak
    ? highlightTile('Longest win streak', stats.longestStreak.name, gamesLabel(stats.longestStreak.games))
    : highlightTile('Longest win streak', '', '');

  return `
    <article class="card">
      <h2 class="card__title">Fun Stats</h2>
      <div class="fun-stats">
        ${statBlock('Side win rate', sideValue)}
        ${statBlock('Biggest blowout', blowout)}
        ${statBlock('Biggest upset', upset)}
        ${statBlock('Average score', average)}
        <div class="fun-pair">
          ${day}
          ${streak}
        </div>
      </div>
    </article>`;
}

export function createStatsView(data: ApiData): StatsView {
  const root = document.createElement('section');
  root.className = 'view view--stats';
  let selectedMatchup = '';

  function render(apiData: ApiData) {
    const { rankings, standings, history, funStats } = computeElo(
      apiData.players,
      apiData.matches,
      apiData.sides
    );
    const topPlayers = rankings.slice(0, 10).map((p) => p.name);
    const chartPlayers = topPlayers.length > 0 ? topPlayers : apiData.players.slice(0, 6);
    const choices = playerChoices(apiData.players, apiData.matches);
    if (selectedMatchup && !choices.includes(selectedMatchup)) selectedMatchup = '';

    root.innerHTML = `
      <h1 class="view-title">Stat Sheet</h1>

      <article class="card">
        <h2 class="card__title">Live ELO Rankings</h2>
        <ol class="elo-list">
          ${
            rankings.length === 0
              ? '<li class="empty-hint">No players yet — log a game to get started.</li>'
              : rankings
                  .map(
                    (p, i) =>
                      `<li><span class="elo-rank">${i + 1}.</span><span class="elo-name">${escapeHtml(p.name)}</span><span class="elo-rating">${p.rating}</span></li>`
                  )
                  .join('')
          }
        </ol>
        ${renderEloChart(history, chartPlayers)}
      </article>

      <article class="card">
        <h2 class="card__title">Standings</h2>
        <table class="standings-table">
          <thead><tr><th>Player</th><th>W</th><th>L</th><th>+/-</th></tr></thead>
          <tbody>
            ${
              standings.length === 0
                ? '<tr><td colspan="4" class="empty-hint">No games logged yet.</td></tr>'
                : standings
                    .map(
                      (s) =>
                        `<tr><td>${escapeHtml(s.name)}</td><td>${s.wins}</td><td>${s.losses}</td><td class="${diffClass(s.pointDiff)}">${formatDiff(s.pointDiff)}</td></tr>`
                    )
                    .join('')
            }
          </tbody>
        </table>
      </article>

      <article class="card">
        <h2 class="card__title">Player Matchups</h2>
        <select class="field-select" data-matchup-select aria-label="Select player">
          <option value="">Select player</option>
          ${choices
            .map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`)
            .join('')}
        </select>
        <div data-matchup-body>${renderMatchupBody(apiData.matches, selectedMatchup)}</div>
      </article>

      ${renderFunStats(funStats, apiData.matches.length)}
    `;

    const select = root.querySelector<HTMLSelectElement>('[data-matchup-select]');
    if (select) {
      select.value = selectedMatchup;
      select.addEventListener('change', () => {
        selectedMatchup = select.value;
        const body = root.querySelector<HTMLElement>('[data-matchup-body]');
        if (body) body.innerHTML = renderMatchupBody(apiData.matches, selectedMatchup);
      });
    }
  }

  render(data);

  return {
    el: root,
    refresh: render,
  };
}
