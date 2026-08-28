(() => {
  const defaults = { theme: 'atlas', font: 'modern', motion: 'system' };
  const allowed = {
    theme: new Set(['atlas', 'forest', 'violet', 'ember']),
    font: new Set(['modern', 'humanist', 'editorial', 'mono']),
    motion: new Set(['system', 'full', 'reduced']),
  };
  const root = document.documentElement;

  for (const key of Object.keys(defaults)) {
    const value = allowed[key].has(root.dataset[key]) ? root.dataset[key] : defaults[key];
    root.dataset[key] = value;
  }

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
