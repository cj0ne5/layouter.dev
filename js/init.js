const STORAGE_KEY = 'wireframe_builder_layout';

function setDomTreeVisibility(enabled, shouldRender = true) {
  domTreeVisible = !!enabled;

  const btn = document.getElementById('dom-tree-toggle-btn');
  if (btn) btn.textContent = domTreeVisible ? 'DOM Tree: On' : 'DOM Tree: Off';

  const domPanel = document.getElementById('dom-tree-panel');
  if (domPanel) domPanel.style.display = domTreeVisible ? '' : 'none';

  if (shouldRender && typeof render === 'function') render();
}

function toggleDomTree() {
  setDomTreeVisibility(!domTreeVisible);
}

function dismissQuickHelp() {
  quickHelpDismissed = true;
  const help = document.getElementById('quick-help');
  if (help) help.style.display = 'none';
}

function saveLayout() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pageTree)); } catch (_) {}
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && saved.type === 'page' && Array.isArray(saved.children)) {
      Object.assign(pageTree, saved);
    }
  } catch (_) {}
}

function tryInit() {
  if (!roughLoaded) return;
  canvas = document.getElementById('wireframe-canvas');
  canvas.width = pageTree.viewport || 1280;
  canvas.height = 600;
  ctx = canvas.getContext('2d');
  rc = rough.canvas(canvas);
  populateTemplateSelect();
  if (!loadFromHash()) loadLayout();
  setupCanvasEvents();
  setupDragDrop();
  render();
  setDomTreeVisibility(domTreeVisible, false);
  _historyReady = true;
  replaceHistoryState(); // seed initial URL without adding a history entry
  new ResizeObserver(() => scaleCanvas()).observe(document.getElementById('canvas-wrap'));
}
