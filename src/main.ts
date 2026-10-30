import { getData } from './api';
import type { ApiData } from './types';
import { createDeleteView } from './views/deleteView';
import { createLogGameView } from './views/logGameView';
import { createStatsView } from './views/statsView';
import './styles.css';

type Tab = 'stats' | 'log' | 'mistake';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const app = document.querySelector('#app')!;
let statsView: ReturnType<typeof createStatsView> | null = null;
let logView: ReturnType<typeof createLogGameView> | null = null;
let deleteView: ReturnType<typeof createDeleteView> | null = null;
let activeTab: Tab = 'stats';

const shell = document.createElement('div');
shell.className = 'app-shell';

const main = document.createElement('main');
main.className = 'app-main';

const statusBar = document.createElement('div');
statusBar.className = 'status-bar';
statusBar.hidden = true;

const nav = document.createElement('nav');
nav.className = 'bottom-nav';
nav.setAttribute('aria-label', 'Main');

const btnStats = document.createElement('button');
btnStats.type = 'button';
btnStats.className = 'bottom-nav__btn';
btnStats.dataset.tab = 'stats';
btnStats.textContent = 'Stats';

const btnLog = document.createElement('button');
btnLog.type = 'button';
btnLog.className = 'bottom-nav__btn';
btnLog.dataset.tab = 'log';
btnLog.textContent = 'Log Game';

const btnMistake = document.createElement('button');
btnMistake.type = 'button';
btnMistake.className = 'bottom-nav__btn';
btnMistake.dataset.tab = 'mistake';
btnMistake.textContent = 'Mistake?';

nav.append(btnStats, btnLog, btnMistake);
shell.append(statusBar, main, nav);
app.appendChild(shell);

function setStatus(message: string, isError: boolean) {
  statusBar.textContent = message;
  statusBar.hidden = false;
  statusBar.classList.toggle('is-error', isError);
}

function clearStatus() {
  statusBar.hidden = true;
  statusBar.textContent = '';
}

function hashFor(tab: Tab): string {
  if (tab === 'log') return '#log';
  if (tab === 'mistake') return '#mistake';
  return '#stats';
}

function parseTab(): Tab {
  const hash = location.hash.replace('#', '');
  if (hash === 'log') return 'log';
  if (hash === 'mistake') return 'mistake';
  return 'stats';
}

function showTab(tab: Tab) {
  activeTab = tab;
  location.hash = hashFor(tab);
  btnStats.classList.toggle('is-active', tab === 'stats');
  btnLog.classList.toggle('is-active', tab === 'log');
  btnMistake.classList.toggle('is-active', tab === 'mistake');
  if (statsView) statsView.el.classList.toggle('view--hidden', tab !== 'stats');
  if (logView) logView.el.classList.toggle('view--hidden', tab !== 'log');
  if (deleteView) deleteView.el.classList.toggle('view--hidden', tab !== 'mistake');
  if (tab === 'stats' || tab === 'mistake') {
    void loadData(true);
  }
}

async function loadData(quiet = false): Promise<ApiData | null> {
  if (!quiet) {
    setStatus('Loading…', false);
  }
  try {
    const data = await getData();
    statsView?.refresh(data);
    logView?.refresh(data);
    deleteView?.refresh(data);
    clearStatus();
    return data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load';
    setStatus(msg, true);
    return null;
  }
}

function initViews(data: ApiData) {
  statsView = createStatsView(data);
  logView = createLogGameView(data, async () => {
    await loadData(true);
    showTab('stats');
  });
  deleteView = createDeleteView(data, async () => {
    await loadData(true);
  });
  main.append(statsView.el, logView.el, deleteView.el);
}

btnStats.addEventListener('click', () => showTab('stats'));
btnLog.addEventListener('click', () => showTab('log'));
btnMistake.addEventListener('click', () => showTab('mistake'));
window.addEventListener('hashchange', () => {
  const tab = parseTab();
  if (tab !== activeTab) showTab(tab);
});

void (async () => {
  setStatus('Loading…', false);
  const data = await loadData(true);
  if (data) {
    initViews(data);
    showTab(parseTab());
  } else {
    main.innerHTML =
      '<p class="boot-error">Could not reach the backend. Set <code>API_URL</code> in src/api.ts and deploy Apps Script.</p>';
  }
})();
