const CONTAINER_TYPES = ['page', 'section', 'header', 'footer', 'div', 'article', 'p'];
const EDGE_ZONE = 8; // px from a container edge → insert before/after in parent instead of inside

// Returns true if `node` is anywhere inside `ancestor`'s subtree
function nodeContains(ancestor, node) {
  if (!ancestor.children) return false;
  for (const child of ancestor.children) {
    if (child === node || nodeContains(child, node)) return true;
  }
  return false;
}

// Find the best container and insert index for a drop at (mx, my).
// excludeNode and its subtree are skipped (used when rearranging canvas elements).
function computeDropTarget(mx, my, excludeNode) {
  let container = pageTree;
  let bestArea = Infinity;
  let bestH = null;

  for (const h of hitBoxes) {
    const n = h.node;
    if (n === excludeNode) continue;
    if (excludeNode && nodeContains(excludeNode, n)) continue;
    if (!CONTAINER_TYPES.includes(n.type)) continue;
    if (mx < h.x || mx > h.x + h.w || my < h.y || my > h.y + h.h) continue;
    const area = h.w * h.h;
    if (area < bestArea) { container = n; bestArea = area; bestH = h; }
  }

  // Edge-zone: if cursor is within EDGE_ZONE px of a non-page container's
  // start/end edge, insert before/after it in its parent rather than inside it.
  if (container !== pageTree && bestH) {
    const isHoriz = container.layout === 'flex';
    const nearStart = isHoriz ? (mx - bestH.x < EDGE_ZONE)          : (my - bestH.y < EDGE_ZONE);
    const nearEnd   = isHoriz ? (bestH.x + bestH.w - mx < EDGE_ZONE) : (bestH.y + bestH.h - my < EDGE_ZONE);
    if (nearStart || nearEnd) {
      const parent = findParent(pageTree, container);
      if (parent) {
        const selfIdx = parent.children.indexOf(container);
        if (selfIdx !== -1) {
          return { parent, index: nearStart ? selfIdx : selfIdx + 1 };
        }
      }
    }
  }

  return insertPosInContainer(container, mx, my, excludeNode);
}

function insertPosInContainer(container, mx, my, excludeNode) {
  const allChildren = container.children || [];

  // Build visible children (excl. dragged node) keeping their original indices
  const visible = allChildren
    .map((node, origIdx) => ({ node, origIdx }))
    .filter(({ node }) => node !== excludeNode);

  let viPos = visible.length; // default: after all visible

  if (container.layout === 'grid') {
    // Grid: 2D reading-order comparison
    for (let vi = 0; vi < visible.length; vi++) {
      const c = visible[vi].node;
      if (c._y === undefined) continue;
      const sameRow = my >= c._y && my < c._y + c._h;
      if (my < c._y) { viPos = vi; break; }          // cursor above this row
      if (sameRow && mx < c._x + c._w / 2) { viPos = vi; break; } // left of midpoint
      if (sameRow) viPos = vi + 1;                   // right half of this row
    }
  } else {
    const isHoriz = container.layout === 'flex';
    for (let vi = 0; vi < visible.length; vi++) {
      const c = visible[vi].node;
      const pivot = isHoriz ? (c._x + c._w / 2) : (c._y + c._h / 2);
      const coord = isHoriz ? mx : my;
      if (coord < pivot) { viPos = vi; break; }
    }
  }

  // Map viPos back to a real index in allChildren
  const realIdx = viPos >= visible.length
    ? allChildren.length
    : visible[viPos].origIdx;

  return { parent: container, index: realIdx };
}

function performCanvasDrop(mx, my) {
  if (!canvasDragNode) return;
  const target = computeDropTarget(mx, my, canvasDragNode);
  if (!target) return;
  if (target.parent === canvasDragNode) return;
  if (nodeContains(canvasDragNode, target.parent)) return;

  const origParent = findParent(pageTree, canvasDragNode);
  const origIndex  = origParent ? origParent.children.indexOf(canvasDragNode) : -1;

  removeNode(pageTree, canvasDragNode);

  let insertIndex = target.index;
  if (origParent === target.parent && origIndex !== -1 && origIndex < insertIndex) {
    insertIndex = Math.max(0, insertIndex - 1);
  }

  if (!target.parent.children) target.parent.children = [];
  target.parent.children.splice(Math.max(0, insertIndex), 0, canvasDragNode);
  selectedNode = canvasDragNode;
}

let dragRenderPending = false;

function setupCanvasEvents() {
  let mdPos = null;
  let mdNode = null;

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const { x: mx, y: my } = getCanvasPos(e);

    let best = null, bestArea = Infinity;
    for (const h of hitBoxes) {
      if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
        const area = h.w * h.h;
        if (area < bestArea) { best = h; bestArea = area; }
      }
    }
    mdPos = { sx: e.clientX, sy: e.clientY };
    mdNode = best ? best.node : null;
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', e => {
    const { x: mx, y: my } = getCanvasPos(e);

    // Initiate canvas drag once threshold exceeded
    if (mdPos && !canvasDragging && mdNode && mdNode.type !== 'page') {
      const dx = e.clientX - mdPos.sx, dy = e.clientY - mdPos.sy;
      if (dx * dx + dy * dy > 25) {
        canvasDragging = true;
        canvasDragNode = mdNode;
        canvas.style.cursor = 'grabbing';
      }
    }

    if (canvasDragging && canvasDragNode) {
      dropIndicator = computeDropTarget(mx, my, canvasDragNode);
      if (!dragRenderPending) {
        dragRenderPending = true;
        requestAnimationFrame(() => { dragRenderPending = false; renderDragFrame(); });
      }
    } else if (!mdPos) {
      let hit = null;
      for (const h of hitBoxes) {
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) hit = h;
      }
      canvas.style.cursor = (hit && hit.node !== pageTree) ? 'grab' : 'default';
    }
  });

  function finishInteraction(e, wasOnCanvas) {
    if (canvasDragging) {
      if (wasOnCanvas && canvasDragNode) {
        const { x: mx, y: my } = getCanvasPos(e);
        pushHistoryState();
        performCanvasDrop(mx, my);
        updatePropsPanel();
      }
      canvasDragging = false;
      canvasDragNode = null;
      dropIndicator = null;
      canvas.style.cursor = 'default';
      render();
    } else if (wasOnCanvas && mdPos) {
      selectedNode = mdNode;
      updatePropsPanel();
      render();
    }
    mdPos = null;
    mdNode = null;
  }

  canvas.addEventListener('mouseup', e => finishInteraction(e, true));

  // Cancel drag if released outside canvas
  window.addEventListener('mouseup', e => {
    if (e.target !== canvas && (canvasDragging || mdPos)) {
      finishInteraction(e, false);
    }
  });
}

function setupDragDrop() {
  document.querySelectorAll('.bank-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragType = el.dataset.type;
      e.dataTransfer.effectAllowed = 'copy';
    });
    el.addEventListener('dragend', () => { dragType = null; });
  });

  let bankDragPending = false;

  canvas.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    canvas.parentElement.classList.add('drag-over');

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top)  * (canvas.height / rect.height);
    dropIndicator = computeDropTarget(mx, my, null);

    if (!bankDragPending) {
      bankDragPending = true;
      requestAnimationFrame(() => { bankDragPending = false; renderDragFrame(); });
    }
  });

  canvas.addEventListener('dragleave', () => {
    canvas.parentElement.classList.remove('drag-over');
    dropIndicator = null;
    renderDragFrame();
  });

  canvas.addEventListener('drop', e => {
    e.preventDefault();
    canvas.parentElement.classList.remove('drag-over');
    if (!dragType) return;

    pushHistoryState();
    const newNode = makeNode(dragType);
    const target = dropIndicator || { parent: pageTree, index: (pageTree.children || []).length };

    if (!target.parent.children) target.parent.children = [];
    target.parent.children.splice(target.index, 0, newNode);

    selectedNode = newNode;
    dropIndicator = null;
    dragType = null;
    render();
    updatePropsPanel();
  });
}

function makeNode(type) {
  const defaults = {
    // Elements
    header:  { type: 'header',  layout: 'flex',  align: 'space-between', padding: '1rem', children: [] },
    footer:  { type: 'footer',  layout: 'flex',  align: 'center',        padding: '0.5rem', children: [{ type: 'p' }] },
    section: { type: 'section', layout: 'block', padding: '2rem', children: [] },
    nav:     { type: 'nav' },
    div:     { type: 'div',     layout: 'block', padding: '1rem', children: [] },
    article: { type: 'article', padding: '0.5rem', children: [] },
    img:     { type: 'img',     size: 'md', aspect: 'landscape' },
    h1: { type: 'h1' }, h2: { type: 'h2' }, h3: { type: 'h3' },
    p: { type: 'p' }, button: { type: 'button' }, logo: { type: 'logo' },
    input: { type: 'input' },
    table: { type: 'table' },

    // Patterns — pre-built trees of real HTML elements
    'pattern-hero': {
      type: 'section', layout: 'block', padding: '2rem',
      children: [{ type: 'h1' }, { type: 'p', text: 'md' }, { type: 'button' }]
    },
    'pattern-cta': {
      type: 'section', layout: 'block', padding: '2rem',
      children: [{ type: 'h2', align: 'center' }, { type: 'p', align: 'center' }, { type: 'button' }]
    },
    'pattern-cards': {
      type: 'section', layout: 'grid', colTemplate: '1fr 1fr 1fr', gap: '1rem', padding: '2rem',
      children: [
        { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] },
        { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] },
        { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] }
      ]
    },
    'pattern-search': {
      type: 'div', layout: 'flex', gap: '0.5rem', padding: '0.5rem',
      children: [{ type: 'input' }, { type: 'button' }]
    },
    'pattern-form': {
      type: 'section', layout: 'block', padding: '2rem',
      children: [{ type: 'h2' }, { type: 'input' }, { type: 'input' }, { type: 'input' }, { type: 'button' }]
    },
    'pattern-banner': {
      type: 'div', layout: 'block', padding: '1rem',
      children: [{ type: 'p' }]
    },
    'pattern-breadcrumbs': { type: 'nav', menuStyle: 'breadcrumbs' },
    'pattern-pagination':  { type: 'nav', menuStyle: 'pagination' },
    'pattern-progress': { type: 'div', layout: 'block', patternHint: 'progress', padding: '0', children: [] },
    'pattern-tags': {
      type: 'div', layout: 'flex', gap: '0.5rem', padding: '0.5rem',
      children: [
        { type: 'button' }, { type: 'button' }, { type: 'button' },
        { type: 'button' }, { type: 'button' }
      ]
    },
    'pattern-hamburger': { type: 'nav', menuStyle: 'hamburger' },
    'pattern-dropdown':  { type: 'nav', menuStyle: 'dropdown' },
    'pattern-megamenu':  { type: 'nav', menuStyle: 'megamenu' },
  };
  return JSON.parse(JSON.stringify(defaults[type] || { type }));
}

function clearLayout() {
  if (!confirm('Clear the entire layout?')) return;
  pushHistoryState();
  pageTree.children = [];
  selectedNode = null;
  updatePropsPanel();
  render();
}
