/* The front door previews the city's written recommendations. The full
   guide owns live ranking, location, opening hours and saved places. */
(() => {
  const cities = {
    'bay-area': { name: 'Bay Area', tz: 'America/Los_Angeles', lead: 'osm-goodthing-74890--244323', highlights: ['mademoiselle-colette-lytton', 'stanford-afternoon', 'lands-end-sutro'] },
    paris: { name: 'Paris', tz: 'Europe/Paris', lead: 'ten-belles' },
    delhi: { name: 'Delhi', tz: 'Asia/Kolkata', lead: 'osm-sunder-nursery-57194-154495' },
    bengaluru: { name: 'Bengaluru', tz: 'Asia/Kolkata', lead: 'osm-koshy-s-25951-155203' },
    'new-york': { name: 'New York', tz: 'America/New_York', lead: 'osm-essex-market-81436--147976' }
  };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeURL = value => {
    try {
      const url = new URL(value, location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const cache = new Map();
  let city = 'bay-area', mood = 'all', pool = [], revision = 0, lastSurprise = null;
  const dialog = $('#idea-dialog');

  const kinds = item => [item.type, ...(item.categories || []), ...(item.goodFor || []), ...(item.labels || [])];
  function category(item) {
    const tags = kinds(item);
    if (['cafe', 'bakery', 'restaurant', 'market'].includes(item.type)) return 'food';
    if (['park', 'garden', 'walk', 'hike'].includes(item.type)) return 'outdoors';
    if (tags.some(t => ['art', 'culture', 'museum', 'gallery', 'music', 'history', 'cinema'].includes(t))) return 'culture';
    if (tags.some(t => ['food', 'coffee', 'bakery', 'cafe', 'restaurant', 'market'].includes(t))) return 'food';
    if (tags.some(t => ['outdoor', 'outdoors', 'walk', 'nature'].includes(t))) return 'outdoors';
    return 'other';
  }
  const categoryWords = item => ({ food: 'Something delicious', culture: 'A little culture', outdoors: 'Some fresh air', other: 'A change of scene' }[category(item)]);
  function photo(item) {
    if (item.image) return safeURL(/^https?:/.test(item.image) ? item.image : `${city}/${item.image}`);
    if (!item.i) return '';
    const parts = item.i.split('/');
    const file = encodeURIComponent(parts.pop());
    return safeURL(`https://upload.wikimedia.org/wikipedia/commons/thumb/${parts.join('/')}/${file}/500px-${file}`);
  }
  const trust = item => item.personal || item.provenance === 'personal' ? 'We’ve been' : item.researched || item.provenance === 'editorial' ? 'Researched' : '';
  const facts = item => [item.area, item.durationMin ? `${item.durationMin} min to enjoy it` : null, item.price === 0 ? 'Free' : item.priceNote].filter(Boolean).join(' · ');

  async function getPool(id) {
    if (cache.has(id)) return cache.get(id);
    const files = ['places', 'itineraries', 'editorial', 'notes'];
    const data = await Promise.all(files.map(async name => {
      const response = await fetch(`${id}/data/${name}.json`);
      if (!response.ok) throw new Error('Could not load city');
      return response.json();
    }));
    const records = new Map();
    data.slice(0, 3).forEach((file, tier) => (file.items || []).forEach(item => {
      records.set(item.id, { ...records.get(item.id), ...item, researched: tier === 2 });
    }));
    Object.entries(data[3].items || {}).forEach(([key, note]) => {
      if (note.hide) { records.delete(key); return; }
      if (note.why) records.set(key, { ...records.get(key), ...note, id: key, personal: true });
    });
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: cities[id].tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = type => parts.find(p => p.type === type).value;
    const date = `${part('year')}-${part('month')}-${part('day')}`;
    const items = [...records.values()].filter(item => item.title && item.why && !item.hide && (!item.end || item.end >= date));
    cache.set(id, items);
    return items;
  }

  function visiblePool() { return mood === 'all' ? pool : pool.filter(item => category(item) === mood); }
  function pickThree(items) {
    if (mood !== 'all') return items.slice(0, 3);
    const picks = [];
    for (const kind of ['food', 'culture', 'outdoors']) {
      const highlighted = (cities[city].highlights || []).map(id => items.find(x => x.id === id)).find(x => x && category(x) === kind);
      const item = highlighted || items.find(x => category(x) === kind);
      if (item) picks.push(item);
    }
    for (const item of items) { if (picks.length >= 3) break; if (!picks.includes(item)) picks.push(item); }
    return picks;
  }
  function imageMarkup(item, className = '') {
    const url = photo(item);
    const context = item.imageKind === 'context' || item.ik === 'c';
    return url ? `<img class="${className}" src="${esc(url)}" alt="${esc(context ? item.imageSubject || item.s || `Around ${item.title}` : item.imageSubject || item.title)}" loading="lazy">` : '<span class="placeholder" aria-hidden="true">⌖</span>';
  }
  function render() {
    const items = visiblePool();
    const picks = pickThree(items);
    $('#picks').innerHTML = picks.map(item => `<article class="pick-card">
      <div class="pick-photo">${imageMarkup(item)}${trust(item) ? `<span>${esc(trust(item))}</span>` : ''}</div>
      <div class="pick-body"><p class="pick-category">${categoryWords(item)}</p><h3>${esc(item.title)}</h3>
        <p class="why">${esc(item.why)}</p><p class="pick-meta">${esc(facts(item))}</p>
        <button class="pick-open" type="button" data-id="${esc(item.id)}" aria-label="Explore ${esc(item.title)}">Explore this idea <span aria-hidden="true">↗</span></button>
      </div></article>`).join('');
    $('#picks').querySelectorAll('img').forEach(img => img.addEventListener('error', () => img.replaceWith(Object.assign(document.createElement('span'), { className: 'placeholder', textContent: '⌖' })), { once: true }));
    $('#status').textContent = picks.length ? '' : 'Nothing in this mood yet. Try another, or explore the whole city guide.';
    $('#picks').setAttribute('aria-busy', 'false');
    $('#surprise').disabled = $('#nudge-surprise').disabled = !items.length;
  }
  function showIdea(item) {
    if (!item) return;
    const url = safeURL(item.url);
    const image = photo(item);
    $('#dialog-content').innerHTML = `<p class="eyebrow">${esc([trust(item), cities[city].name].filter(Boolean).join(' · '))}</p>
      <h2 id="dialog-title">${esc(item.title)}</h2>${image ? imageMarkup(item, 'dialog-photo') : ''}
      <p class="dialog-copy">${esc(item.why)}</p><p class="pick-meta">${esc(facts(item))}</p>
      ${image ? `<p class="dialog-credit">${esc(item.imageCredit || 'Wikimedia Commons')}${item.imageKind === 'context' || item.ik === 'c' ? ' · Neighbourhood photograph' : ''}</p>` : ''}
      <p class="dialog-credit">${item.lastVerified ? `Guide last checked ${esc(item.lastVerified)}. ` : ''}Check current hours before heading over.</p>
      <div class="dialog-actions">${url ? `<a class="primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Check the details ↗</a>` : ''}<a class="quiet" href="${city}/">Explore the city guide ↗</a></div>`;
    if (!dialog.open) dialog.showModal();
  }
  function surprise() {
    const items = visiblePool();
    const fresh = items.filter(item => item.id !== lastSurprise);
    const choices = fresh.length ? fresh : items;
    const item = choices[Math.floor(Math.random() * choices.length)];
    if (item) { lastSurprise = item.id; showIdea(item); }
  }
  async function changeCity(id) {
    if (!cities[id]) return;
    const current = ++revision;
    city = id;
    pool = [];
    if (dialog.open) dialog.close();
    $('#city').value = id;
    $('#city-name').textContent = cities[id].name === 'Bay Area' ? 'The Bay Area' : cities[id].name;
    $('#find').href = $('#guide').href = `${id}/`;
    $('#ideas-sub').textContent = `Explore ${cities[id].name === 'Bay Area' ? 'the Bay Area' : cities[id].name}. Pick what feels like you.`;
    $('#dateline').textContent = new Date().toLocaleDateString('en-GB', { timeZone: cities[id].tz, weekday: 'long', day: 'numeric', month: 'long' });
    $('#surprise').disabled = $('#nudge-surprise').disabled = true;
    $('#picks').innerHTML = '';
    $('#picks').setAttribute('aria-busy', 'true');
    $('#status').textContent = 'Finding a few good ideas…';
    try {
      const items = await getPool(id);
      if (revision !== current) return;
      pool = items;
      render();
      try { localStorage.setItem('allez.home.city', id); } catch {}
    } catch {
      if (revision !== current) return;
      $('#picks').setAttribute('aria-busy', 'false');
      $('#status').textContent = 'The ideas couldn’t load. Your city guide is still one tap away.';
    }
  }

  $('#city').addEventListener('change', e => changeCity(e.target.value));
  document.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click', () => {
    mood = button.dataset.mood;
    document.querySelectorAll('[data-mood]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    render();
  }));
  $('#picks').addEventListener('click', e => { const button = e.target.closest('[data-id]'); if (button) showIdea(pool.find(item => item.id === button.dataset.id)); });
  $('#surprise').addEventListener('click', surprise);
  $('#nudge-surprise').addEventListener('click', surprise);
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  // Same switch and key as the city guides (js/app.js), so the choice follows you.
  const themeButton = $('#theme');
  const applyTheme = dark => {
    if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    themeButton.textContent = dark ? '☀' : '☾';
    themeButton.title = dark ? 'Switch to light' : 'Switch to dark';
    themeButton.setAttribute('aria-label', themeButton.title);
  };
  applyTheme(document.documentElement.dataset.theme === 'dark');
  themeButton.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    applyTheme(dark);
    try { localStorage.setItem('homeground.theme', dark ? 'dark' : 'light'); } catch {}
  });
  try { const saved = localStorage.getItem('allez.home.city'); if (cities[saved]) city = saved; } catch {}
  changeCity(city);
})();
/* The opening reel: a hard cut every 2.4s. Footage is only fetched after
   the page has loaded, one shot ahead; a clip plays over its own first
   frame once it can, and a shot that isn't ready yet holds the current
   one. Nothing moves for reduced motion, off-screen, in a hidden tab, or
   once paused. */
(() => {
  const reel = document.querySelector('.reel');
  if (!reel || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const slides = [...reel.querySelectorAll('.reel-slide')];
  const button = reel.querySelector('.reel-pause');
  let index = 0, timer = 0, paused = false, visible = true, loaded = false;
  const load = slide => {
    const img = slide.querySelector('img');
    if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
    if (slide.dataset.video && !slide.querySelector('video')) {
      const video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, loop: true, preload: 'auto', src: slide.dataset.video });
      video.setAttribute('aria-hidden', 'true');
      video.addEventListener('playing', () => video.classList.add('ready'));
      slide.append(video);
    }
  };
  const play = slide => { const v = slide.querySelector('video'); if (v) { v.currentTime = 0; v.play().catch(() => {}); } };
  const ready = slide => { const img = slide.querySelector('img'); return !img.dataset.src && img.complete && img.naturalWidth > 0; };
  const next = () => {
    const i = (index + 1) % slides.length;
    if (!ready(slides[i])) { load(slides[i]); return; }
    slides[index].classList.remove('on');
    slides[index].querySelector('video')?.pause();
    slides[i].classList.add('on');
    play(slides[i]);
    index = i;
    load(slides[(i + 1) % slides.length]);
  };
  const sync = () => {
    clearInterval(timer);
    const running = loaded && !paused && visible && !document.hidden;
    if (running) timer = setInterval(next, 2400);
    const v = slides[index].querySelector('video');
    if (v) running ? v.play().catch(() => {}) : v.pause();
  };
  addEventListener('load', () => { loaded = true; load(slides[0]); load(slides[1]); play(slides[0]); sync(); }, { once: true });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(reel);
  button.addEventListener('click', () => {
    paused = !paused;
    button.textContent = paused ? '▶' : '❚❚';
    button.setAttribute('aria-label', paused ? 'Play the film' : 'Pause the film');
    sync();
  });
})();
