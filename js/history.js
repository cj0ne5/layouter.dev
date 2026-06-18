// URL-based design sharing and undo/redo via browser history.
//
// Format: #v1:BASE64 where BASE64 is btoa(JSON.stringify(cleanPageTree))
//
// Forward compatibility rules:
//   - Only add new OPTIONAL properties to nodes; never rename or remove existing ones.
//   - Existing code already defaults missing props (n.layout || 'block', etc.) so old
//     links continue to load correctly even as the schema grows.
//   - If a future change is breaking (renames/removes a field), bump the version to #v2:
//     and add a migration branch in decodeDesign() below.

function stripInternal(node) {
  const clean = Object.assign({}, node);
  delete clean._x; delete clean._y; delete clean._w; delete clean._h;
  delete clean._colWidths; delete clean._colOffsets;
  delete clean._rowHeights; delete clean._rowOffsets;
  delete clean._innerX;
  if (clean.children) clean.children = clean.children.map(stripInternal);
  return clean;
}

function encodeDesign() {
  return btoa(JSON.stringify(stripInternal(pageTree)));
}

function decodeDesign(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch (_) {
    return null;
  }
}

// Returns true if design was successfully loaded from the URL hash.
function loadFromHash() {
  const hash = location.hash;
  if (!hash.startsWith('#v1:')) return false;
  const design = decodeDesign(hash.slice(4));
  if (design && design.type === 'page' && Array.isArray(design.children)) {
    Object.assign(pageTree, design);
    return true;
  }
  return false;
}

let _historyReady = false;

// Call BEFORE mutating pageTree to save the pre-change state as an undoable history entry.
// Browser Back then restores that saved state (= undo); Forward re-applies it (= redo).
function pushHistoryState() {
  if (!_historyReady) return;
  const encoded = encodeDesign();
  history.pushState({ v: 1, encoded }, '', '#v1:' + encoded);
}

// Called by render() on every structural render to keep the URL current without
// adding a history entry. This is what makes the URL shareable at any point.
function replaceHistoryState() {
  if (!_historyReady) return;
  const encoded = encodeDesign();
  history.replaceState({ v: 1, encoded }, '', '#v1:' + encoded);
}

function copyShareLink() {
  replaceHistoryState();
  navigator.clipboard.writeText(location.href).then(() => {
    const btn = document.getElementById('copy-link-btn');
    const prev = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = prev; }, 1500);
  });
}

window.addEventListener('popstate', e => {
  let design = null;
  if (e.state && e.state.v === 1 && e.state.encoded) {
    design = decodeDesign(e.state.encoded);
  }
  if (!design) {
    const hash = location.hash;
    if (hash.startsWith('#v1:')) design = decodeDesign(hash.slice(4));
  }
  if (!design || design.type !== 'page') return;

  const wasReady = _historyReady;
  _historyReady = false; // prevent recursive push during restore
  Object.assign(pageTree, design);
  selectedNode = null;
  updatePropsPanel();
  render();
  _historyReady = wasReady;
});
