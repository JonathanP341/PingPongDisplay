export function createScoreWheel(
  label: string,
  values: number[],
  initial: number,
  onChange: (value: number) => void
): { el: HTMLElement; setValues: (next: number[], selected: number) => void; setValue: (n: number) => void } {
  const wrap = document.createElement('div');
  wrap.className = 'score-wheel';

  const lab = document.createElement('div');
  lab.className = 'score-wheel__label';
  lab.textContent = label;

  const viewport = document.createElement('div');
  viewport.className = 'score-wheel__viewport';

  const list = document.createElement('div');
  list.className = 'score-wheel__list';
  viewport.appendChild(list);

  wrap.append(lab, viewport);

  let currentValues = values;
  let selected = initial;

  function renderItems() {
    list.innerHTML = '';
    for (const v of currentValues) {
      const item = document.createElement('div');
      item.className = 'score-wheel__item';
      item.dataset.value = String(v);
      item.textContent = String(v);
      if (v === selected) item.classList.add('is-selected');
      list.appendChild(item);
    }
  }

  function scrollToValue(value: number, smooth: boolean) {
    const item = list.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
    if (!item) return;
    const top = item.offsetTop - (viewport.clientHeight - item.clientHeight) / 2;
    viewport.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }

  function pickClosest() {
    const center = viewport.scrollTop + viewport.clientHeight / 2;
    const items = [...list.querySelectorAll<HTMLElement>('.score-wheel__item')];
    if (items.length === 0) return;
    let bestEl = items[0];
    let bestDist = Infinity;
    for (const item of items) {
      const mid = item.offsetTop + item.clientHeight / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestEl = item;
      }
    }
    if (!bestEl) return;
    const v = Number(bestEl.dataset.value);
    if (v !== selected) {
      selected = v;
      list.querySelectorAll('.score-wheel__item').forEach((el) => el.classList.remove('is-selected'));
      bestEl.classList.add('is-selected');
      onChange(v);
    }
  }

  let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;
  viewport.addEventListener('scroll', () => {
    if (scrollEndTimer) clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(pickClosest, 80);
  });

  renderItems();
  requestAnimationFrame(() => scrollToValue(selected, false));

  return {
    el: wrap,
    setValues(next: number[], nextSelected: number) {
      currentValues = next;
      selected = nextSelected;
      renderItems();
      requestAnimationFrame(() => scrollToValue(selected, false));
    },
    setValue(n: number) {
      if (!currentValues.includes(n)) return;
      selected = n;
      list.querySelectorAll<HTMLElement>('.score-wheel__item').forEach((el) => {
        el.classList.toggle('is-selected', el.dataset.value === String(n));
      });
      scrollToValue(n, true);
    },
  };
}
