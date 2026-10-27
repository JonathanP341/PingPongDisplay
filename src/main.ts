import { getData } from './api';
import type { ApiData } from './types';
import { createLogGameView } from './views/logGameView';
import { createStatsView } from './views/statsView';
import './styles.css';

type Tab = 'stats' | 'log';

const app = document.querySelector('#app')!;
let statsView: ReturnType<typeof createStatsView> | null = null;
let logView: ReturnType<typeof createLogGameView> | null = null;
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

nav.append(btnStats, btnLog);
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

function parseTab(): Tab {
  const hash = location.hash.replace('#', '');
  return hash === 'log' ? 'log' : 'stats';
}

function showTab(tab: Tab) {
  activeTab = tab;
  location.hash = tab === 'log' ? '#log' : '#stats';
  btnStats.classList.toggle('is-active', tab === 'stats');
  btnLog.classList.toggle('is-active', tab === 'log');
  if (statsView) statsView.el.classList.toggle('view--hidden', tab !== 'stats');
  if (logView) logView.el.classList.toggle('view--hidden', tab !== 'log');
  if (tab === 'stats') {
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
  main.append(statsView.el, logView.el);
}

btnStats.addEventListener('click', () => showTab('stats'));
btnLog.addEventListener('click', () => showTab('log'));
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
