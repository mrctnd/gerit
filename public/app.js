(() => {
  const quickAdd = document.querySelector('#quick-add');
  const search = document.querySelector('#global-search');
  const rows = [...document.querySelectorAll('[data-task-row]')];
  let selectedIndex = rows.length ? 0 : -1;

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
      rows[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  if (rows.length) selectRow(0, false);

  rows.forEach((row, index) => {
    row.addEventListener('pointerdown', () => selectRow(index, false));
    row.addEventListener('focusin', () => selectRow(index, false));
  });

  document.addEventListener('keydown', (event) => {
    const typing = isTyping(event.target);

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
})();
