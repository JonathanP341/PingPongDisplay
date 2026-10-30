import { submitMatch } from '../api';
import { createPlayerSelect } from '../components/playerSelect';
import { createScoreWheel } from '../components/scoreWheel';
import {
  DEFAULT_LOSER_SCORE,
  DEFAULT_WINNER_SCORE,
  isValidScorePair,
  loserScoreForWinner,
  loserScoreOptions,
  winnerScoreOptions,
} from '../scores';
import type { ApiData } from '../types';

export interface LogGameView {
  el: HTMLElement;
  refresh: (data: ApiData) => void;
}

export function createLogGameView(
  data: ApiData,
  onPublished: () => Promise<void>
): LogGameView {
  const root = document.createElement('section');
  root.className = 'view view--log';

  const title = document.createElement('h1');
  title.className = 'view-title';
  title.textContent = 'Log Game';

  const grid = document.createElement('div');
  grid.className = 'player-grid';

  const winnerCol = document.createElement('div');
  winnerCol.className = 'player-col';
  const winnerHeading = document.createElement('h2');
  winnerHeading.textContent = 'Winner';
  const loserCol = document.createElement('div');
  loserCol.className = 'player-col';
  const loserHeading = document.createElement('h2');
  loserHeading.textContent = 'Loser';

  let winnerScore = DEFAULT_WINNER_SCORE;
  let loserScore = DEFAULT_LOSER_SCORE;
  let sides = data.sides.length ? data.sides : ['Fridge', 'Outdent'];
  let selectedSide = sides[0] ?? '';

  const sideWrap = document.createElement('div');
  sideWrap.className = 'side-picker';
  const sideLabel = document.createElement('span');
  sideLabel.className = 'field-label';
  sideLabel.textContent = 'Set Side';
  const sideButtons = document.createElement('div');
  sideButtons.className = 'side-picker__buttons';

  function renderSideButtons() {
    sideButtons.innerHTML = '';
    for (const side of sides) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'side-btn';
      btn.textContent = side;
      if (side === selectedSide) btn.classList.add('is-active');
      btn.addEventListener('click', () => {
        selectedSide = side;
        renderSideButtons();
        updatePublish();
      });
      sideButtons.appendChild(btn);
    }
  }
  renderSideButtons();
  sideWrap.append(sideLabel, sideButtons);

  function syncScoresFromWinner() {
    const opts = loserScoreOptions(winnerScore);
    if (!opts.includes(loserScore)) {
      loserScore = loserScoreForWinner(winnerScore);
    }
    loserWheel.setValues(opts, loserScore);
  }

  const publishBtn = document.createElement('button');
  publishBtn.type = 'button';
  publishBtn.className = 'btn-publish';
  publishBtn.textContent = 'PUBLISH';

  let winnerSelect!: ReturnType<typeof createPlayerSelect>;
  let loserSelect!: ReturnType<typeof createPlayerSelect>;

  function formValid(): boolean {
    if (!winnerSelect.state.isValid() || !loserSelect.state.isValid()) return false;
    const w = winnerSelect.state.getName();
    const l = loserSelect.state.getName();
    if (!w || !l || w.toLowerCase() === l.toLowerCase()) return false;
    if (!selectedSide) return false;
    return isValidScorePair(winnerScore, loserScore);
  }

  const updatePublish = () => {
    publishBtn.disabled = !formValid();
  };

  winnerSelect = createPlayerSelect(data.players, 'Set Name', updatePublish);
  loserSelect = createPlayerSelect(data.players, 'Set Name', updatePublish);

  winnerCol.append(winnerHeading, winnerSelect.el, sideWrap);
  loserCol.append(loserHeading, loserSelect.el);

  const scoreSection = document.createElement('div');
  scoreSection.className = 'score-section';
  const scoreTitle = document.createElement('h2');
  scoreTitle.className = 'score-section__title';
  scoreTitle.textContent = 'Set Score';

  const wheels = document.createElement('div');
  wheels.className = 'score-wheels';

  const winnerWheel = createScoreWheel('Winner', winnerScoreOptions(), winnerScore, (v) => {
    winnerScore = v;
    syncScoresFromWinner();
    updatePublish();
  });

  const loserWheel = createScoreWheel(
    'Loser',
    loserScoreOptions(winnerScore),
    loserScore,
    (v) => {
      loserScore = v;
      updatePublish();
    }
  );

  wheels.append(winnerWheel.el, loserWheel.el);
  scoreSection.append(scoreTitle, wheels);

  const msg = document.createElement('p');
  msg.className = 'form-message';
  msg.hidden = true;

  function resetScoresAndSide() {
    winnerScore = DEFAULT_WINNER_SCORE;
    loserScore = DEFAULT_LOSER_SCORE;
    selectedSide = sides[0] ?? '';
    renderSideButtons();
    winnerWheel.setValue(DEFAULT_WINNER_SCORE);
    syncScoresFromWinner();
    msg.hidden = true;
    msg.textContent = '';
    msg.classList.remove('is-error', 'is-success');
  }

  function resetNames() {
    winnerSelect.reset();
    loserSelect.reset();
    updatePublish();
  }

  publishBtn.addEventListener('click', async () => {
    msg.hidden = true;
    if (!formValid()) {
      msg.textContent = 'Fill in all fields with a valid score (win by 2).';
      msg.hidden = false;
      msg.classList.add('is-error');
      return;
    }
    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing…';
    try {
      await submitMatch({
        winner: winnerSelect.state.getName(),
        loser: loserSelect.state.getName(),
        winnerScore,
        loserScore,
        winnerSide: selectedSide,
      });
      resetScoresAndSide();
      await onPublished();
      resetNames();
    } catch (e) {
      msg.textContent = e instanceof Error ? e.message : 'Publish failed';
      msg.hidden = false;
      msg.classList.add('is-error');
      msg.classList.remove('is-success');
    } finally {
      publishBtn.textContent = 'PUBLISH';
      publishBtn.disabled = !formValid();
    }
  });

  grid.append(winnerCol, loserCol);
  root.append(title, grid, scoreSection, msg, publishBtn);

  updatePublish();

  return {
    el: root,
    refresh(apiData: ApiData) {
      sides = apiData.sides.length ? apiData.sides : sides;
      if (!sides.includes(selectedSide)) selectedSide = sides[0] ?? '';
      renderSideButtons();
      winnerSelect.setPlayers(apiData.players);
      loserSelect.setPlayers(apiData.players);
      updatePublish();
    },
  };
}
