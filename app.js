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

function base64UrlDecode(str) {
  try {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return decodeURIComponent(escape(atob(base64)));
  } catch (err) {
    return null;
  }
}

// The bot encodes onboarding settings (balance, interests, city) into a
// base64url payload and attaches it to the "Открыть каталог" button — as a
// `?start=` query param when opened as a plain link, or via the open_app
// button's `payload` field when opened as a native Mini App (the exact key
// MAX exposes that under in window.WebApp.initData isn't confirmed, so a
// few likely candidates are tried here).
function getStartSettings() {
  const candidates = [];

  const params = new URLSearchParams(window.location.search);
  ['start', 'startapp', 'payload'].forEach((key) => {
    const value = params.get(key);
    if (value) candidates.push(value);
  });

  if (window.WebApp && window.WebApp.initData) {
    const initParams = new URLSearchParams(window.WebApp.initData);
    ['start_param', 'startapp', 'payload'].forEach((key) => {
      const value = initParams.get(key);
      if (value) candidates.push(value);
    });
  }

  for (const raw of candidates) {
    const decoded = base64UrlDecode(raw);
    if (!decoded) continue;
    try {
      return JSON.parse(decoded);
    } catch (err) {
      // not valid JSON — try the next candidate instead of failing outright
    }
  }
  return null;
}

function applyStartSettings() {
  const settings = getStartSettings();
  if (!settings) return;

  if (typeof settings.balance === 'number') {
    state.balance = settings.balance;
  }

  if (Array.isArray(settings.interests) && settings.interests.length > 0) {
    const keywordToCategory = {
      музе: 'museum',
      выставк: 'museum',
      театр: 'theatre',
      спектакл: 'theatre',
      концерт: 'concert',
      музык: 'concert',
      джаз: 'concert',
      'мастер-класс': 'workshop',
      'мастер класс': 'workshop',
      'своими руками': 'workshop',
      кино: 'cinema',
      фильм: 'cinema',
      экскурси: 'excursion',
      прогулк: 'excursion',
    };
    const firstMatch = settings.interests
      .map((interest) => {
        const hit = Object.entries(keywordToCategory).find(([kw]) => interest.includes(kw));
        return hit ? hit[1] : null;
      })
      .find(Boolean);
    if (firstMatch) {
      els.categoryFilter.value = firstMatch;
    }
  }
}

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

// If opened as a real MAX Mini App, window.WebApp will exist — tell MAX
// the page is ready. Outside MAX (plain browser) this is just skipped.
if (window.WebApp && typeof window.WebApp.ready === 'function') {
  try {
    window.WebApp.ready();
  } catch (err) {
    console.warn('MAX WebApp.ready() failed (probably fine outside MAX):', err);
  }
}

applyStartSettings();
updateBalanceDisplay();
loadEvents();
