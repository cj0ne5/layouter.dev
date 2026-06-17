function buildDomTree() {
  const panel = document.getElementById('dom-tree-panel');
  if (!panel || !canvas) return;
  panel.innerHTML = '';

  // Match the canvas scale so positions align with the (possibly shrunk) canvas.
  const cssW = parseFloat(canvas.style.width) || canvas.width;
  const scale = cssW / canvas.width;
  panel.style.height = Math.round(canvas.height * scale) + 'px';

  const INDENT = 14;
  const BASE = 8;
  const MIN_H = 22;                          // minimum label height in display pixels
  const MIN_H_C = Math.ceil(MIN_H / scale);  // same threshold in canvas pixel space

  // Walk collects {node, canvasY, depth} for every visible node.
  // Positions are in canvas pixel space; scaling and overlap resolution happen afterward.
  const items = [];

  function walk(node, depth, bandTop, bandBottom) {
    const canvasY = bandTop !== undefined ? bandTop + 2 : (node._y || 0) + 2;
    items.push({ node, canvasY, depth });

    const children = node.children || [];
    if (!children.length) return;
    const layout = node.layout || 'block';

    if (layout === 'flex') {
      const cTop = canvasY + MIN_H_C;
      const cBottom = Math.max(
        bandBottom !== undefined ? bandBottom : (node._y || 0) + (node._h || 0),
        cTop + children.length * MIN_H_C
      );
      const slotH = (cBottom - cTop) / children.length;
      for (let i = 0; i < children.length; i++) {
        walk(children[i], depth + 1, cTop + i * slotH, cTop + (i + 1) * slotH);
      }

    } else if (layout === 'grid') {
      const cols = node._colWidths ? node._colWidths.length : (node.columns || 2);
      const n = children.length;
      const rows = Math.ceil(n / cols);
      const cTop = canvasY + MIN_H_C;
      const cBottom = Math.max(
        bandBottom !== undefined ? bandBottom : (node._y || 0) + (node._h || 0),
        cTop + rows * MIN_H_C
      );
      const rowH = (cBottom - cTop) / rows;
      for (let r = 0; r < rows; r++) {
        const rowTop = cTop + r * rowH;
        const colsInRow = Math.min(cols, n - r * cols);
        const slotH = rowH / colsInRow;
        for (let c = 0; c < colsInRow; c++) {
          walk(children[r * cols + c], depth + 1, rowTop + c * slotH, rowTop + (c + 1) * slotH);
        }
      }

    } else if (bandTop !== undefined) {
      // Block children inside a flex/grid band: distribute proportionally
      const cTop = canvasY + MIN_H_C;
      const cBottom = Math.max(bandBottom, cTop + children.length * MIN_H_C);
      const totalChildH = children.reduce((s, c) => s + Math.max(c._h || MIN_H_C, MIN_H_C), 0);
      let cy = cTop;
      for (const child of children) {
        const childH = Math.max(child._h || MIN_H_C, MIN_H_C);
        const slotH = Math.max(MIN_H_C, childH / totalChildH * (cBottom - cTop));
        walk(child, depth + 1, cy, cy + slotH);
        cy += slotH;
      }

    } else {
      // Normal block flow: children use their _y directly
      for (const child of children) walk(child, depth + 1);
    }
  }

  walk(pageTree, 0);

  // Convert canvas-pixel Y → display-pixel Y, then resolve any overlaps in display space.
  // Items are in tree/display order, so a single linear pass is sufficient.
  let bottom = -Infinity;
  for (const item of items) {
    item.displayY = Math.max(Math.round(item.canvasY * scale), bottom + 2);
    item.cy = item.displayY + 11;
    bottom = item.displayY + MIN_H;
  }

  function addLine(x1, y1, x2, y2) {
    const el = document.createElement('div');
    el.className = 'dom-line';
    if (y1 === y2) {
      el.style.cssText = `left:${x1}px;top:${y1}px;width:${x2 - x1}px;height:1px`;
    } else {
      el.style.cssText = `left:${x1}px;top:${Math.min(y1, y2)}px;width:1px;height:${Math.abs(y2 - y1)}px`;
    }
    panel.appendChild(el);
  }

  // Lines rendered before labels so labels sit on top
  items.forEach(({ node, cy, depth }, idx) => {
    if (depth > 0) {
      const gx = depth * INDENT + BASE;
      addLine(gx, cy, gx + 10, cy);
    }
    if (node.children && node.children.length > 0) {
      const gx = (depth + 1) * INDENT + BASE;
      let lastChildCy = -1;
      for (let j = idx + 1; j < items.length; j++) {
        if (items[j].depth <= depth) break;
        if (items[j].depth === depth + 1) lastChildCy = items[j].cy;
      }
      if (lastChildCy > cy + 11) addLine(gx, cy + 11, gx, lastChildCy);
    }
  });

  items.forEach(({ node, displayY, depth }) => {
    const item = document.createElement('div');
    item.className = 'dom-item' + (node === selectedNode ? ' dom-selected' : '');
    item.style.top = displayY + 'px';
    item.style.paddingLeft = (depth > 0 ? depth * INDENT + BASE + 12 : BASE) + 'px';
    item.textContent = node.type === 'page' ? 'body' : node.type;
    item.addEventListener('click', () => {
      selectedNode = node;
      updatePropsPanel();
      render();
    });
    panel.appendChild(item);
  });
}
