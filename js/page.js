/* The plain pages (about/, terms/): only the light/dark switch, with the
   same key as the homepage and the city guides. */
(() => {
  const button = document.getElementById('theme');
  const apply = dark => {
    if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    button.textContent = dark ? '☀' : '☾';
    button.title = dark ? 'Switch to light' : 'Switch to dark';
    button.setAttribute('aria-label', button.title);
  };
  apply(document.documentElement.dataset.theme === 'dark');
  button.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    apply(dark);
    try { localStorage.setItem('homeground.theme', dark ? 'dark' : 'light'); } catch {}
  });
})();
