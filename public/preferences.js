(() => {
  const defaults = { theme: 'atlas', font: 'modern', motion: 'system', scale: 100 };
  const allowed = {
    theme: new Set(['atlas', 'forest', 'violet', 'ember']),
    font: new Set(['modern', 'humanist', 'editorial', 'mono']),
    motion: new Set(['system', 'full', 'reduced']),
  };
  const root = document.documentElement;

  for (const key of ['theme', 'font', 'motion']) {
    const value = allowed[key].has(root.dataset[key]) ? root.dataset[key] : defaults[key];
    root.dataset[key] = value;
  }
  const parsedScale = Number(root.dataset.scale);
  const scale = Number.isFinite(parsedScale)
    ? Math.min(160, Math.max(80, Math.round(parsedScale / 5) * 5))
    : defaults.scale;
  root.dataset.scale = String(scale);
  root.style.setProperty('--ui-scale', String(scale / 100));

  const themeColors = {
    atlas: '#102a43',
    forest: '#143a32',
    violet: '#302451',
    ember: '#3b2a2a',
  };
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    themeColors[root.dataset.theme],
  );
})();
