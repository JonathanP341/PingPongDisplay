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

  const frame = document.createElement('div');
  frame.className = 'score-wheel__frame';

  const viewport = document.createElement('div');
  viewport.className = 'score-wheel__viewport';
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'spinbutton');
  viewport.setAttribute('aria-label', label);

  const list = document.createElement('div');
  list.className = 'score-wheel__list';
  viewport.appendChild(list);

  const highlight = document.createElement('div');
  highlight.className = 'score-wheel__highlight';
  highlight.setAttribute('aria-hidden', 'true');

  frame.append(viewport, highlight);
  wrap.append(lab, frame);

  let currentValues = values;
  let selected = initial;
  let ignoreScroll = 0;
  let needsAlign = true;
  let dragging = false;
  let dragStartY = 0;
  let dragStartScroll = 0;

  function itemEls(): HTMLElement[] {
    return [...list.querySelectorAll<HTMLElement>('.score-wheel__item')];
  }

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
    viewport.setAttribute('aria-valuenow', String(selected));
    viewport.setAttribute('aria-valuemin', String(currentValues[0] ?? 0));
    viewport.setAttribute('aria-valuemax', String(currentValues[currentValues.length - 1] ?? 0));
  }

  function centerDelta(item: HTMLElement): number {
    const box = viewport.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    return itemBox.top + itemBox.height / 2 - (box.top + box.height / 2);
  }

  function centeredItem(): HTMLElement | null {
    if (viewport.clientHeight === 0) return null;
    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    for (const item of itemEls()) {
      const dist = Math.abs(centerDelta(item));
      if (dist < bestDist) {
        bestDist = dist;
        best = item;
      }
    }
    return best;
  }

  function paintSelection(value: number) {
    for (const item of itemEls()) {
      item.classList.toggle('is-selected', Number(item.dataset.value) === value);
    }
    viewport.setAttribute('aria-valuenow', String(value));
  }

  function commitCentered() {
    const best = centeredItem();
    if (!best) return;
    const value = Number(best.dataset.value);
    paintSelection(value);
    if (value !== selected) {
      selected = value;
      onChange(value);
    }
  }

  function scrollToValue(value: number) {
    const item = list.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
    if (!item || viewport.clientHeight === 0) return;
    const top = viewport.scrollTop + centerDelta(item);
    paintSelection(value);
    if (Math.abs(viewport.scrollTop - top) < 1) return;
    ignoreScroll++;
    viewport.scrollTop = top;
    requestAnimationFrame(() => {
      ignoreScroll = Math.max(0, ignoreScroll - 1);
    });
  }

  function alignIfNeeded() {
    if (!needsAlign || viewport.clientHeight === 0) return;
    scrollToValue(selected);
    needsAlign = false;
  }

  function step(direction: 1 | -1) {
    const index = currentValues.indexOf(selected);
    if (index < 0) return;
    const next = currentValues[index + direction];
    if (next === undefined) return;
    selected = next;
    needsAlign = true;
    alignIfNeeded();
    onChange(next);
  }

  viewport.addEventListener('scroll', () => {
    if (ignoreScroll > 0) return;
    commitCentered();
  });

  let wheelLock = false;
  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (wheelLock || event.deltaY === 0) return;
      wheelLock = true;
      window.setTimeout(() => {
        wheelLock = false;
      }, 140);
      step(event.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragging = true;
    dragStartY = event.clientY;
    dragStartScroll = viewport.scrollTop;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    viewport.scrollTop = dragStartScroll - (event.clientY - dragStartY);
    commitCentered();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    const best = centeredItem();
    if (!best) return;
    const delta = centerDelta(best);
    if (Math.abs(delta) > 1) {
      ignoreScroll++;
      viewport.scrollTop += delta;
      requestAnimationFrame(() => {
        ignoreScroll = Math.max(0, ignoreScroll - 1);
      });
    }
    commitCentered();
  }

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') step(-1);
    else if (event.key === 'ArrowDown') step(1);
    else return;
    event.preventDefault();
  });

  const resizeObserver = new ResizeObserver(() => alignIfNeeded());
  resizeObserver.observe(viewport);

  renderItems();
  requestAnimationFrame(alignIfNeeded);

  return {
    el: wrap,
    setValues(next: number[], nextSelected: number) {
      currentValues = next;
      selected = nextSelected;
      needsAlign = true;
      renderItems();
      alignIfNeeded();
    },
    setValue(n: number) {
      if (!currentValues.includes(n)) return;
      selected = n;
      needsAlign = true;
      paintSelection(n);
      alignIfNeeded();
    },
  };
}
