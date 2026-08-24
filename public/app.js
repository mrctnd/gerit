(() => {
  const storageKey = 'gerit.appearance.v1';
  const defaults = { theme: 'atlas', font: 'modern', motion: 'system' };
  const labels = {
    theme: { atlas: 'Atlas', forest: 'Orman', violet: 'Lavanta', ember: 'Kehribar' },
    font: { modern: 'Modern', humanist: 'Humanist', editorial: 'Editoryal', mono: 'Teknik' },
    motion: { system: 'Sistemi izle', full: 'Akıcı', reduced: 'Sakin' },
  };
  const themeColors = {
    atlas: '#102a43',
    forest: '#143a32',
    violet: '#302451',
    ember: '#3b2a2a',
  };
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const quickAdd = document.querySelector('#quick-add');
  const search = document.querySelector('#global-search');
  const rows = [...document.querySelectorAll('[data-task-row]')];
  const appearanceDialog = document.querySelector('#appearance-dialog');
  const appearanceTrigger = document.querySelector('#appearance-trigger');
  const appearancePanel = appearanceDialog?.querySelector('.appearance-panel');
  const appearanceStatus = document.querySelector('#appearance-status');
  const progressInput = document.querySelector('input[name="progress"]');
  const progressOutput = document.querySelector('[data-progress-output]');
  let selectedIndex = rows.length ? 0 : -1;

  function readPreferences() {
    return {
      theme: root.dataset.theme || defaults.theme,
      font: root.dataset.font || defaults.font,
      motion: root.dataset.motion || defaults.motion,
    };
  }

  function writePreferences(preferences) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // The app remains usable when browser storage is unavailable.
    }
  }

  function prefersReducedMotion() {
    const preference = root.dataset.motion || defaults.motion;
    return preference === 'reduced' || (preference === 'system' && systemMotion.matches);
  }

  function play(target, keyframes, options = {}) {
    if (!target || prefersReducedMotion() || typeof target.animate !== 'function') {
      return Promise.resolve();
    }

    try {
      const animation = target.animate(keyframes, {
        duration: 320,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        ...options,
      });
      return animation.finished.catch(() => undefined);
    } catch {
      return Promise.resolve();
    }
  }

  function announce(message) {
    if (!appearanceStatus) return;
    appearanceStatus.textContent = '';
    window.requestAnimationFrame(() => { appearanceStatus.textContent = message; });
  }

  function syncAppearanceControls() {
    const preferences = readPreferences();
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeOption === preferences.theme));
    });
    document.querySelectorAll('[data-font-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.fontOption === preferences.font));
    });
    document.querySelectorAll('[data-motion-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.motionOption === preferences.motion));
    });
  }

  function syncProgress() {
    if (progressInput && progressOutput) progressOutput.textContent = `%${progressInput.value}`;
  }

  function applyPreference(key, value, shouldAnnounce = true) {
    root.classList.add('theme-changing');
    root.dataset[key] = value;
    const preferences = readPreferences();
    writePreferences(preferences);
    syncAppearanceControls();

    if (key === 'theme') {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[value]);
      play(document.querySelector('.app-shell'), [
        { opacity: 0.82, transform: 'scale(.996)' },
        { opacity: 1, transform: 'scale(1)' },
      ], { duration: 380 });
      play(document.querySelector('.appearance-trigger-icon'), [
        { transform: 'rotate(-32deg) scale(.82)' },
        { transform: 'rotate(0) scale(1)' },
      ], { duration: 460 });
    }

    if (shouldAnnounce) announce(labels[key][value] + ' seçildi.');
    window.setTimeout(() => root.classList.remove('theme-changing'), 460);
  }

  function isTyping(target) {
    return target instanceof HTMLElement && (
      target.matches('input, textarea, select, button') || target.isContentEditable
    );
  }

  function selectRow(index, shouldFocus = true) {
    if (!rows.length) return;
    selectedIndex = (index + rows.length) % rows.length;
    rows.forEach((row, rowIndex) => row.classList.toggle('is-selected', rowIndex === selectedIndex));
    if (shouldFocus) {
      rows[selectedIndex].focus({ preventScroll: true });
      rows[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      play(rows[selectedIndex], [
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' },
      ], { duration: 240 });
    }
  }

  function openAppearance() {
    if (!appearanceDialog || appearanceDialog.open) return;
    syncAppearanceControls();
    appearanceDialog.showModal();
    document.body.classList.add('dialog-open');
    play(appearancePanel, [
      { opacity: 0, transform: 'translateY(10px) scale(.985)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration: 260 });
    const selected = appearanceDialog.querySelector('[data-theme-option][aria-pressed="true"]');
    selected?.focus({ preventScroll: true });
  }

  async function closeAppearance() {
    if (!appearanceDialog?.open) return;
    await play(appearancePanel, [
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(7px) scale(.99)' },
    ], { duration: 150, easing: 'cubic-bezier(.55, 0, 1, .45)' });
    appearanceDialog.close();
    appearanceTrigger?.focus({ preventScroll: true });
  }

  if (rows.length) selectRow(0, false);

  rows.forEach((row, index) => {
    row.addEventListener('pointerdown', () => selectRow(index, false));
    row.addEventListener('focusin', () => selectRow(index, false));
  });

  appearanceTrigger?.addEventListener('click', openAppearance);
  appearanceDialog?.querySelector('[data-close-appearance]')?.addEventListener('click', closeAppearance);
  appearanceDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeAppearance();
  });
  appearanceDialog?.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  appearanceDialog?.addEventListener('click', (event) => {
    if (event.target === appearanceDialog) closeAppearance();
  });

  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => applyPreference('theme', button.dataset.themeOption));
  });
  document.querySelectorAll('[data-font-option]').forEach((button) => {
    button.addEventListener('click', () => applyPreference('font', button.dataset.fontOption));
  });
  document.querySelectorAll('[data-motion-option]').forEach((button) => {
    button.addEventListener('click', () => applyPreference('motion', button.dataset.motionOption));
  });
  document.querySelector('[data-reset-appearance]')?.addEventListener('click', () => {
    Object.entries(defaults).forEach(([key, value]) => applyPreference(key, value, false));
    announce('Görünüm varsayılan ayarlara döndü.');
  });

  document.addEventListener('keydown', (event) => {
    const typing = isTyping(event.target);

    if (!typing && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      openAppearance();
      return;
    }

    if (!typing && event.key.toLowerCase() === 'n' && quickAdd) {
      event.preventDefault();
      quickAdd.focus();
      return;
    }

    if (!typing && event.key === '/' && search) {
      event.preventDefault();
      search.focus();
      search.select();
      return;
    }

    if (!typing && ['j', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      selectRow(selectedIndex + 1);
      return;
    }

    if (!typing && ['k', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      selectRow(selectedIndex - 1);
      return;
    }

    if (!typing && event.key.toLowerCase() === 'x' && selectedIndex >= 0) {
      event.preventDefault();
      rows[selectedIndex].querySelector('.complete-form')?.requestSubmit();
      return;
    }

    if (event.key === 'Escape' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  document.querySelectorAll('[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm)) event.preventDefault();
    });
  });

  document.querySelectorAll('.complete-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      if (prefersReducedMotion() || form.dataset.submitting === 'true') return;
      event.preventDefault();
      form.dataset.submitting = 'true';
      const row = form.closest('.task-row');
      const button = form.querySelector('.complete-button');
      row?.classList.add('is-completing');
      await Promise.all([
        play(button, [
          { transform: 'scale(1)' },
          { transform: 'scale(1.18)', offset: 0.42 },
          { transform: 'scale(1)' },
        ], { duration: 220 }),
        play(row, [
          { opacity: 1, transform: 'translateY(0) scale(1)' },
          { opacity: 0, transform: 'translateY(-5px) scale(.995)' },
        ], { duration: 240 }),
      ]);
      HTMLFormElement.prototype.submit.call(form);
    });
  });

  document.querySelector('#quick-add-form')?.addEventListener('submit', () => {
    document.querySelector('.quick-add-card')?.classList.add('is-submitting');
  });

  progressInput?.addEventListener('input', syncProgress);

  systemMotion.addEventListener?.('change', syncAppearanceControls);
  syncProgress();
  syncAppearanceControls();
})();
