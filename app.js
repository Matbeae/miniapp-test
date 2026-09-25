const CATEGORY_LABELS = {
  museum: 'Музей / выставка',
  theatre: 'Театр',
  concert: 'Концерт',
  workshop: 'Мастер-класс',
  cinema: 'Кино',
  excursion: 'Экскурсия',
};

const state = {
  events: [],
  balance: 5000,
  saved: new Set(),
};

const els = {
  balanceValue: document.getElementById('balanceValue'),
  editBalance: document.getElementById('editBalance'),
  categoryFilter: document.getElementById('categoryFilter'),
  priceFilter: document.getElementById('priceFilter'),
  searchFilter: document.getElementById('searchFilter'),
  catalog: document.getElementById('catalog'),
  template: document.getElementById('cardTemplate'),
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function render() {
  const category = els.categoryFilter.value;
  const maxPrice = parseInt(els.priceFilter.value, 10);
  const query = els.searchFilter.value.trim().toLowerCase();

  const filtered = state.events.filter((ev) => {
    if (category && ev.category !== category) return false;
    if (Number.isFinite(maxPrice) && ev.price > maxPrice) return false;
    if (query) {
      const haystack = `${ev.title} ${ev.description} ${ev.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  els.catalog.innerHTML = '';
  if (filtered.length === 0) {
    els.catalog.innerHTML = '<p style="text-align:center;color:#7a6a63;">Ничего не нашлось под эти фильтры.</p>';
    return;
  }

  for (const ev of filtered) {
    const node = els.template.content.cloneNode(true);
    node.querySelector('.card__date').textContent = `${formatDate(ev.date)} · ${ev.time}`;
    node.querySelector('.card__title').textContent = ev.title;
    node.querySelector('.card__meta').textContent = `${CATEGORY_LABELS[ev.category] || ev.category} · ${ev.address}`;
    node.querySelector('.card__desc').textContent = ev.description;
    node.querySelector('.card__price').textContent = `${ev.price} ₽ · Пушкинская карта`;

    const tagsEl = node.querySelector('.card__tags');
    ev.tags.forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      tagsEl.appendChild(span);
    });

    const saveBtn = node.querySelector('.card__save');
    if (state.saved.has(ev.id)) {
      saveBtn.textContent = 'Сохранено';
      saveBtn.disabled = true;
    }
    saveBtn.addEventListener('click', () => {
      state.saved.add(ev.id);
      saveBtn.textContent = 'Сохранено';
      saveBtn.disabled = true;
    });

    els.catalog.appendChild(node);
  }
}

function updateBalanceDisplay() {
  els.balanceValue.textContent = `${state.balance} ₽`;
}

async function loadEvents() {
  const res = await fetch('data/events.json');
  state.events = await res.json();
  render();
}

els.editBalance.addEventListener('click', () => {
  const input = prompt('Сколько баллов осталось?', state.balance);
  const num = parseInt(input, 10);
  if (Number.isFinite(num) && num >= 0) {
    state.balance = num;
    updateBalanceDisplay();
  }
});

[els.categoryFilter, els.priceFilter, els.searchFilter].forEach((el) =>
  el.addEventListener('input', render)
);

updateBalanceDisplay();
loadEvents();
