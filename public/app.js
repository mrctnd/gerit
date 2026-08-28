(() => {
  const defaults = { theme: 'atlas', font: 'modern', motion: 'system', scale: 100 };
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
  const scaleInput = document.querySelector('[data-scale-input]');
  const scaleOutput = document.querySelector('[data-scale-output]');
  const motionPreviewMarker = document.querySelector('[data-motion-preview-marker]');
  const motionPreviewLabel = document.querySelector('[data-motion-preview-label]');
  const progressInput = document.querySelector('input[name="progress"]');
  const progressOutput = document.querySelector('[data-progress-output]');
  let selectedIndex = rows.length ? 0 : -1;
  let pendingPreferences = null;
  let preferenceSaveVersion = 0;

  function readPreferences() {
    return {
      theme: root.dataset.theme || defaults.theme,
      font: root.dataset.font || defaults.font,
      motion: root.dataset.motion || defaults.motion,
      scale: normalizeScale(root.dataset.scale),
    };
  }

  function normalizeScale(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return defaults.scale;
    return Math.min(160, Math.max(80, Math.round(parsed / 5) * 5));
  }

  function flushPreferencesWithBeacon() {
    if (!pendingPreferences || typeof navigator.sendBeacon !== 'function') return;
    try {
      const payload = new Blob([JSON.stringify(pendingPreferences)], { type: 'application/json' });
      navigator.sendBeacon('/api/preferences/appearance', payload);
    } catch {
      // The active save request remains the source of truth.
    }
  }

  function writePreferences(preferences) {
    const saveVersion = ++preferenceSaveVersion;
    pendingPreferences = preferences;
    try {
      fetch('/api/preferences/appearance', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
        keepalive: true,
      }).then((response) => {
        if (!response.ok) throw new Error('appearance-save-failed');
        if (saveVersion === preferenceSaveVersion) pendingPreferences = null;
      }).catch(() => {
        announce('Görünüm kaydedilemedi; yeniden deneyin.');
      });
    } catch {
      announce('Görünüm kaydedilemedi; yeniden deneyin.');
    }
  }

  function prefersReducedMotion() {
    const preference = root.dataset.motion || defaults.motion;
    return preference === 'reduced' || (preference === 'system' && systemMotion.matches);
  }

  function motionProfile() {
    const preference = root.dataset.motion || defaults.motion;
    if (preference === 'full') return { duration: 360, distance: 10, stagger: 28 };
    if (prefersReducedMotion()) return { duration: 1, distance: 0, stagger: 0 };
    return { duration: 210, distance: 4, stagger: 0 };
  }

  function play(target, keyframes, options = {}) {
    if (!target || prefersReducedMotion() || typeof target.animate !== 'function') {
      return Promise.resolve();
    }

    try {
      const profile = motionProfile();
      const { duration: optionDuration, ...animationOptions } = options;
      const requestedDuration = optionDuration || profile.duration;
      const animation = target.animate(keyframes, {
        duration: root.dataset.motion === 'full' ? requestedDuration : Math.min(requestedDuration, profile.duration),
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        ...animationOptions,
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
    if (scaleInput) scaleInput.value = String(preferences.scale);
    if (scaleOutput) scaleOutput.textContent = `%${preferences.scale}`;
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

    if (key === 'motion') previewMotion(value);

    if (shouldAnnounce) announce(labels[key][value] + ' seçildi.');
    window.setTimeout(() => root.classList.remove('theme-changing'), 460);
  }

  function applyScale(value, { save = true, shouldAnnounce = true } = {}) {
    const scale = normalizeScale(value);
    root.dataset.scale = String(scale);
    root.style.setProperty('--ui-scale', String(scale / 100));
    syncAppearanceControls();
    if (save) writePreferences(readPreferences());
    if (shouldAnnounce) announce(`Arayüz ölçeği %${scale}.`);
  }

  function previewMotion(mode = root.dataset.motion) {
    if (!motionPreviewMarker) return;
    const labelsByMode = { system: 'Sistemi izle', full: 'Akıcı', reduced: 'Sakin' };
    if (motionPreviewLabel) motionPreviewLabel.textContent = labelsByMode[mode] || labelsByMode.system;
    motionPreviewMarker.getAnimations?.().forEach((animation) => animation.cancel());
    if (mode === 'reduced' || (mode === 'system' && systemMotion.matches)
      || typeof motionPreviewMarker.animate !== 'function') {
      motionPreviewMarker.style.transform = 'translateX(0)';
      return;
    }
    const distance = mode === 'full' ? 104 : 62;
    const duration = mode === 'full' ? 720 : 420;
    motionPreviewMarker.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(${distance}px)`, offset: 0.48 },
      { transform: mode === 'full' ? `translateX(${distance - 12}px)` : `translateX(${distance}px)`, offset: 0.64 },
      { transform: 'translateX(0)' },
    ], { duration, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  }

  function revealWorkspace() {
    if (prefersReducedMotion()) return;
    const profile = motionProfile();
    const selectors = root.dataset.motion === 'full'
      ? ['.page-heading', '.work-summary, .presales-summary, .presales-case-hero', '.quick-add-card, .presales-metrics', '.task-surface']
      : ['.page-heading', '.task-surface'];
    selectors.forEach((selector, index) => {
      const target = document.querySelector(selector);
      if (!target) return;
      play(target, [
        { opacity: 0, transform: `translateY(${profile.distance}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: profile.duration, delay: index * profile.stagger, fill: 'both' });
    });
  }

  function setupProductEditor(editor) {
    const rowsContainer = editor.querySelector('[data-product-rows]');
    const template = editor.querySelector('[data-product-template]');
    const addButton = editor.querySelector('[data-add-product]');
    if (!rowsContainer || !template || !addButton) return;

    const syncRows = () => {
      const productRows = [...rowsContainer.querySelectorAll('[data-product-row]')];
      productRows.forEach((row, index) => {
        const indexLabel = row.querySelector('[data-product-index]');
        if (indexLabel) indexLabel.textContent = String(index + 1);
      });
      addButton.disabled = productRows.length >= 30;
    };

    addButton.addEventListener('click', () => {
      if (rowsContainer.querySelectorAll('[data-product-row]').length >= 30) return;
      const row = template.content.firstElementChild?.cloneNode(true);
      if (!(row instanceof HTMLElement)) return;
      rowsContainer.append(row);
      syncRows();
      play(row, [
        { opacity: 0, transform: 'translateY(-6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 260 });
      row.querySelector('input')?.focus();
    });

    rowsContainer.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const removeButton = event.target.closest('[data-remove-product]');
      if (!removeButton) return;
      const row = removeButton.closest('[data-product-row]');
      if (!row) return;
      const productRows = rowsContainer.querySelectorAll('[data-product-row]');
      if (productRows.length === 1) {
        row.querySelectorAll('input').forEach((input) => { input.value = ''; });
      } else {
        row.remove();
      }
      syncRows();
    });

    syncRows();
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
  scaleInput?.addEventListener('input', () => {
    applyScale(scaleInput.value, { save: false, shouldAnnounce: false });
  });
  scaleInput?.addEventListener('change', () => applyScale(scaleInput.value));
  document.querySelectorAll('[data-scale-step]').forEach((button) => {
    button.addEventListener('click', () => {
      applyScale(readPreferences().scale + Number(button.dataset.scaleStep));
    });
  });
  document.querySelector('[data-reset-appearance]')?.addEventListener('click', () => {
    ['theme', 'font', 'motion'].forEach((key) => applyPreference(key, defaults[key], false));
    applyScale(defaults.scale, { shouldAnnounce: false });
    announce('Görünüm varsayılan ayarlara döndü.');
  });

  document.querySelectorAll('[data-product-editor]').forEach(setupProductEditor);

  document.addEventListener('keydown', (event) => {
    const typing = isTyping(event.target);

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      if (['+', '=', 'Add'].includes(event.key)) {
        event.preventDefault();
        applyScale(readPreferences().scale + 5);
        return;
      }
      if (['-', '_', 'Subtract'].includes(event.key)) {
        event.preventDefault();
        applyScale(readPreferences().scale - 5);
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        applyScale(defaults.scale);
        return;
      }
    }

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
  window.addEventListener('pagehide', flushPreferencesWithBeacon);
  syncProgress();
  syncAppearanceControls();
  previewMotion();
  window.requestAnimationFrame(revealWorkspace);
})();
