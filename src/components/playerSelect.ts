const NEW_PLAYER = '__new__';

export interface PlayerSelectState {
  getName: () => string;
  isValid: () => boolean;
}

export function createPlayerSelect(
  players: string[],
  placeholder: string,
  onChange: () => void
): { el: HTMLElement; state: PlayerSelectState; setPlayers: (names: string[]) => void; reset: () => void } {
  const wrap = document.createElement('div');
  wrap.className = 'player-select';

  const select = document.createElement('select');
  select.className = 'field-select';
  select.setAttribute('aria-label', placeholder);

  const newInput = document.createElement('input');
  newInput.type = 'text';
  newInput.className = 'field-input player-select__new';
  newInput.placeholder = 'New player name';
  newInput.hidden = true;
  newInput.maxLength = 40;

  function rebuildOptions(names: string[]) {
    const prev = select.value;
    select.innerHTML = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    select.appendChild(empty);
    for (const name of names) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }
    const neu = document.createElement('option');
    neu.value = NEW_PLAYER;
    neu.textContent = 'New player…';
    select.appendChild(neu);
    if ([...select.options].some((o) => o.value === prev)) {
      select.value = prev;
    }
    newInput.hidden = select.value !== NEW_PLAYER;
  }

  rebuildOptions(players);

  select.addEventListener('change', () => {
    newInput.hidden = select.value !== NEW_PLAYER;
    if (select.value !== NEW_PLAYER) newInput.value = '';
    onChange();
  });
  newInput.addEventListener('input', onChange);

  wrap.append(select, newInput);

  const state: PlayerSelectState = {
    getName() {
      if (select.value === NEW_PLAYER) return newInput.value.trim();
      return select.value.trim();
    },
    isValid() {
      if (select.value === NEW_PLAYER) {
        const n = newInput.value.trim();
        return n.length > 0 && n.length <= 40;
      }
      return select.value !== '';
    },
  };

  return {
    el: wrap,
    state,
    setPlayers(names: string[]) {
      rebuildOptions(names);
    },
    reset() {
      select.value = '';
      newInput.value = '';
      newInput.hidden = true;
      onChange();
    },
  };
}
