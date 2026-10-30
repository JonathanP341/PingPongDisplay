import { deleteLatestMatch } from '../api';
import { computeElo, START_RATING } from '../elo';
import type { ApiData, Match } from '../types';

export interface DeleteView {
  el: HTMLElement;
  refresh: (data: ApiData) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatElo(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function eloClass(delta: number): string {
  if (delta > 0) return 'scoreboard__elo is-up';
  if (delta < 0) return 'scoreboard__elo is-down';
  return 'scoreboard__elo';
}

function formatWhen(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function latestChange(data: ApiData): { match: Match; winnerDelta: number; loserDelta: number } | null {
  if (data.matches.length === 0) return null;
  const match = data.matches[data.matches.length - 1];
  const { history } = computeElo(data.players, data.matches, data.sides);
  const after = history[history.length - 1]?.ratings ?? {};
  const before = history.length > 1 ? history[history.length - 2].ratings : {};
  return {
    match,
    winnerDelta: (after[match.winner] ?? START_RATING) - (before[match.winner] ?? START_RATING),
    loserDelta: (after[match.loser] ?? START_RATING) - (before[match.loser] ?? START_RATING),
  };
}

export function createDeleteView(data: ApiData, onDeleted: () => Promise<void>): DeleteView {
  const root = document.createElement('section');
  root.className = 'view view--mistake';

  const title = document.createElement('h1');
  title.className = 'view-title';
  title.textContent = 'Mistake?';

  const card = document.createElement('article');
  card.className = 'card';

  const cardTitle = document.createElement('h2');
  cardTitle.className = 'card__title';
  cardTitle.textContent = 'Most recent game';

  const body = document.createElement('div');

  const msg = document.createElement('p');
  msg.className = 'form-message';
  msg.hidden = true;

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'DELETE';

  card.append(cardTitle, body);
  root.append(title, card, msg, deleteBtn);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.hidden = true;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal__backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal__card';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'delete-confirm-title');

  const question = document.createElement('p');
  question.id = 'delete-confirm-title';
  question.className = 'modal__title';
  question.textContent = 'Are you sure?';

  const actions = document.createElement('div');
  actions.className = 'modal__actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'Cancel';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'btn-delete btn-delete--dialog';
  confirmBtn.textContent = 'DELETE';

  actions.append(cancelBtn, confirmBtn);
  dialog.append(question, actions);
  modal.append(backdrop, dialog);
  root.append(modal);

  function closeModal() {
    modal.hidden = true;
  }

  function render(apiData: ApiData) {
    const latest = latestChange(apiData);
    if (!latest) {
      body.innerHTML = '<p class="empty-hint">No games logged yet.</p>';
      deleteBtn.hidden = true;
      return;
    }
    deleteBtn.hidden = false;
    const { match, winnerDelta, loserDelta } = latest;
    const when = formatWhen(match.timestamp);
    const side = match.winnerSide
      ? `<p class="scoreboard__caption">${escapeHtml(match.winnerSide)}</p>`
      : '';
    body.innerHTML = `
      ${when ? `<p class="delete-when">${escapeHtml(when)}</p>` : ''}
      <div class="scoreboard delete-board">
        <span class="scoreboard__name scoreboard__name--left">${escapeHtml(match.winner)}</span>
        <span class="scoreboard__score scoreboard__score--lead">${match.winnerScore}</span>
        <span class="scoreboard__colon" aria-hidden="true">:</span>
        <span class="scoreboard__score scoreboard__score--trail">${match.loserScore}</span>
        <span class="scoreboard__name scoreboard__name--right">${escapeHtml(match.loser)}</span>
        <span class="${eloClass(winnerDelta)} scoreboard__elo--left">${formatElo(winnerDelta)}</span>
        <span class="${eloClass(loserDelta)} scoreboard__elo--right">${formatElo(loserDelta)}</span>
      </div>
      ${side}
    `;
  }

  deleteBtn.addEventListener('click', () => {
    msg.hidden = true;
    modal.hidden = false;
    cancelBtn.focus();
  });
  cancelBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    deleteBtn.disabled = true;
    try {
      await deleteLatestMatch();
      closeModal();
      await onDeleted();
    } catch (e) {
      closeModal();
      msg.textContent = e instanceof Error ? e.message : 'Could not delete game';
      msg.hidden = false;
      msg.classList.add('is-error');
    } finally {
      confirmBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  });

  render(data);

  return { el: root, refresh: render };
}
