(() => {
  const storageKey = 'gerit.appearance.v1';
  const defaults = { theme: 'atlas', font: 'modern', motion: 'system' };
  const allowed = {
    theme: new Set(['atlas', 'forest', 'violet', 'ember']),
    font: new Set(['modern', 'humanist', 'editorial', 'mono']),
    motion: new Set(['system', 'full', 'reduced']),
  };

  let saved = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
  } catch {
    saved = {};
  }

  for (const key of Object.keys(defaults)) {
    const value = allowed[key].has(saved[key]) ? saved[key] : defaults[key];
    document.documentElement.dataset[key] = value;
  }

  const themeColors = {
    atlas: '#102a43',
    forest: '#143a32',
    violet: '#302451',
    ember: '#3b2a2a',
  };
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    themeColors[document.documentElement.dataset.theme],
  );
})();
