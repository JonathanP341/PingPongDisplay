import { computeElo } from '../elo';
import type { ApiData, EloHistoryPoint } from '../types';

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

export function createStatsView(data: ApiData): StatsView {
  const root = document.createElement('section');
  root.className = 'view view--stats';

  function render(apiData: ApiData) {
    const { rankings, standings, history } = computeElo(apiData.players, apiData.matches);
    const topPlayers = rankings.slice(0, 10).map((p) => p.name);
    const chartPlayers =
      topPlayers.length > 0 ? topPlayers : apiData.players.slice(0, 6);

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
          <thead><tr><th>Player</th><th>W</th><th>L</th></tr></thead>
          <tbody>
            ${
              standings.length === 0
                ? '<tr><td colspan="3" class="empty-hint">No games logged yet.</td></tr>'
                : standings
                    .map(
                      (s) =>
                        `<tr><td>${escapeHtml(s.name)}</td><td>${s.wins}</td><td>${s.losses}</td></tr>`
                    )
                    .join('')
            }
          </tbody>
        </table>
      </article>

      <article class="card card--muted">
        <h2 class="card__title">Other chart, TBD</h2>
        <p class="empty-hint">More stats coming later.</p>
      </article>
    `;
  }

  render(data);

  return {
    el: root,
    refresh: render,
  };
}
