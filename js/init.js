const STORAGE_KEY = 'wireframe_builder_layout';

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
  _historyReady = true;
  replaceHistoryState(); // seed initial URL without adding a history entry
  new ResizeObserver(() => scaleCanvas()).observe(document.getElementById('canvas-wrap'));
}
