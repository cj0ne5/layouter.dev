function renderTree(node) {
  if (node.type === 'page') {
    const x = node._x, y = node._y, w = node._w, h = node._h;
    const isSelected = node === selectedNode;
    rc.rectangle(x, y, w, h, {
      roughness: 0.4,
      stroke: isSelected ? '#3366cc' : '#bbb',
      strokeWidth: isSelected ? 2 : 1.2,
      strokeLineDash: isSelected ? [] : [8, 5]
    });
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = isSelected ? '#3366cc' : '#bbb';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('body', x + 6, y + 4);
    ctx.restore();
    hitBoxes.push({ node, x, y, w, h });
    for (const child of (node.children || [])) renderTree(child);
    return;
  }

  const x = node._x, y = node._y, w = node._w, h = node._h;
  if (!w || !h) return;

  const fill = FILLS[node.type] || FILLS.default;
  const isSelected = node === selectedNode;

  const opts = {
    ...ROUGH_OPTS,
    fill,
    fillStyle: 'solid',
    stroke: isSelected ? '#3366cc' : '#555',
    strokeWidth: isSelected ? 2.2 : ROUGH_OPTS.strokeWidth
  };

  // p: custom render — multiple paragraphs and optional float img
  if (node.type === 'p') {
    rc.rectangle(x, y, w, h, opts);
    const pad = PADDING[node.padding] || 0;
    const floatImg = (node.children || []).find(c => c._floated);
    if (floatImg) {
      const imgSel = floatImg === selectedNode;
      const imgOpts = { ...ROUGH_OPTS, fill: FILLS.img, fillStyle: 'solid', stroke: imgSel ? '#3366cc' : '#555', strokeWidth: imgSel ? 2.2 : ROUGH_OPTS.strokeWidth };
      rc.rectangle(floatImg._x, floatImg._y, floatImg._w, floatImg._h, imgOpts);
      rc.line(floatImg._x, floatImg._y, floatImg._x + floatImg._w, floatImg._y + floatImg._h, { roughness: 0.8, stroke: '#888', strokeWidth: 1 });
      rc.line(floatImg._x + floatImg._w, floatImg._y, floatImg._x, floatImg._y + floatImg._h, { roughness: 0.8, stroke: '#888', strokeWidth: 1 });
      hitBoxes.push({ node: floatImg, x: floatImg._x, y: floatImg._y, w: floatImg._w, h: floatImg._h });
      const gap = 10;
      const textX = floatImg.float === 'left' ? floatImg._x + floatImg._w + gap : x + pad;
      const textMaxX = floatImg.float === 'left' ? x + w - pad : floatImg._x - gap;
      drawSquigglyLines(node, textX, y + pad, textMaxX - textX, h - pad * 2);
    } else {
      // Render any non-float children first (they stack above the text)
      let textStartY = y + 4;
      for (const child of (node.children || [])) {
        renderTree(child);
        textStartY = Math.max(textStartY, child._y + child._h + 4);
      }
      drawSquigglyLines(node, x + 4, textStartY, w - 8, y + h - 4 - textStartY);
    }
    hitBoxes.push({ node, x, y, w, h });
    return;
  }

  if (node.type === 'img') {
    rc.rectangle(x, y, w, h, opts);
    rc.line(x, y, x + w, y + h, { roughness: 0.8, stroke: '#888', strokeWidth: 1 });
    rc.line(x + w, y, x, y + h, { roughness: 0.8, stroke: '#888', strokeWidth: 1 });
  } else if (node.type === 'button') {
    rc.rectangle(x + w * 0.2, y + 8, w * 0.6, h - 16, { ...opts, fill: '#c8deff', strokeWidth: 1.5 });
    drawLabel(node, x, y, w, h);
  } else if (node.type === 'input') {
    ctx.save();
    if (node.showLabel) {
      const labelW = Math.round(w * 0.3);
      const fieldX = x + labelW + 8, fieldW = w - labelW - 8;
      ctx.font = '12px monospace'; ctx.fillStyle = '#555';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('Label', x + labelW, y + h / 2);
      rc.rectangle(fieldX, y + 3, fieldW, h - 6, { ...opts, fill: FILLS.input, strokeWidth: 1.2 });
      const lw2 = Math.min(fieldW * 0.4, 80);
      ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fieldX + 8, y + h / 2); ctx.lineTo(fieldX + 8 + lw2, y + h / 2); ctx.stroke();
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fieldX + 11 + lw2, y + h / 2 - 6); ctx.lineTo(fieldX + 11 + lw2, y + h / 2 + 6); ctx.stroke();
    } else {
      rc.rectangle(x, y, w, h, { ...opts, fill: FILLS.input, strokeWidth: 1.2 });
      const lw = Math.min(w * 0.4, 100);
      ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 10, y + h / 2); ctx.lineTo(x + 10 + lw, y + h / 2); ctx.stroke();
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 13 + lw, y + h / 2 - 7); ctx.lineTo(x + 13 + lw, y + h / 2 + 7); ctx.stroke();
    }
    ctx.restore();

  } else if (node.type === 'table') {
    rc.rectangle(x, y, w, h, { ...opts, fill: FILLS.table, strokeWidth: 1.2 });
    const cols = 4, rows = 4;
    const cellW = w / cols, cellH = h / rows;
    // Header row tint
    ctx.save(); ctx.fillStyle = '#d8e4f8'; ctx.fillRect(x + 1, y + 1, w - 2, cellH - 2); ctx.restore();
    for (let c = 1; c < cols; c++) {
      rc.line(x + c * cellW, y, x + c * cellW, y + h, { roughness: 0.4, stroke: '#bbb', strokeWidth: 0.8 });
    }
    for (let r = 1; r < rows; r++) {
      rc.line(x, y + r * cellH, x + w, y + r * cellH,
        { roughness: 0.4, stroke: '#bbb', strokeWidth: r === 1 ? 1.5 : 0.7 });
    }

  } else if (node.type === 'nav') {
    const ms = node.menuStyle || 'horizontal';
    rc.rectangle(x, y, w, h, { ...opts, fill: 'transparent', strokeWidth: 1 });

    if (ms === 'hamburger') {
      ctx.save();
      ctx.font = '22px sans-serif'; ctx.fillStyle = '#5577aa';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('☰', x + w / 2, y + h / 2);
      ctx.restore();

    } else if (ms === 'breadcrumbs') {
      ctx.save();
      ctx.font = '12px monospace'; ctx.textBaseline = 'middle';
      const crumbs = ['Home', 'Category', 'Page'];
      let cx2 = x + 12;
      for (let i = 0; i < crumbs.length; i++) {
        ctx.fillStyle = i === crumbs.length - 1 ? '#333' : '#5577aa';
        ctx.fillText(crumbs[i], cx2, y + h / 2);
        cx2 += ctx.measureText(crumbs[i]).width + 6;
        if (i < crumbs.length - 1) {
          ctx.fillStyle = '#bbb'; ctx.fillText('›', cx2, y + h / 2);
          cx2 += ctx.measureText('›').width + 6;
        }
      }
      ctx.restore();

    } else if (ms === 'pagination') {
      const items = ['‹', '1', '2', '3', '4', '5', '›'];
      const bw = 26, bh = h - 10;
      const totalW = items.length * bw + (items.length - 1) * 4;
      let bx = x + (w - totalW) / 2;
      for (let i = 0; i < items.length; i++) {
        const active = items[i] === '1';
        rc.rectangle(bx, y + 5, bw, bh, {
          roughness: 0.6, fill: active ? '#c8d8ee' : '#f0f0f0', fillStyle: 'solid', stroke: '#bbb', strokeWidth: 1
        });
        ctx.save();
        ctx.font = '11px monospace'; ctx.fillStyle = active ? '#3366cc' : '#666';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(items[i], bx + bw / 2, y + h / 2);
        ctx.restore();
        bx += bw + 4;
      }

    } else if (ms === 'dropdown') {
      const barH = 36;
      const items = ['Home ▾', 'About', 'Contact'];
      const pw2 = Math.min(72, (w - 20) / items.length - 6);
      for (let i = 0; i < items.length; i++) {
        rc.rectangle(x + 10 + i * (pw2 + 6), y + 4, pw2, barH - 8, {
          roughness: 0.6, fill: i === 0 ? '#c8d8ee' : '#f5f5f5', fillStyle: 'solid', stroke: '#88a', strokeWidth: 1
        });
        ctx.save();
        ctx.font = '10px monospace'; ctx.fillStyle = '#444';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(items[i], x + 10 + i * (pw2 + 6) + pw2 / 2, y + barH / 2);
        ctx.restore();
      }
      // Dropdown panel below first item
      const dropX = x + 10, dropY = y + barH, dropW = pw2 + 16, dropH = h - barH;
      rc.rectangle(dropX, dropY, dropW, dropH, {
        roughness: 0.4, fill: '#f8f8f8', fillStyle: 'solid', stroke: '#bbb', strokeWidth: 1
      });
      ['Link 1', 'Link 2', 'Link 3'].forEach((lk, i) => {
        ctx.save(); ctx.font = '10px monospace'; ctx.fillStyle = '#555';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(lk, dropX + 8, dropY + dropH / 6 + i * (dropH / 3));
        ctx.restore();
      });

    } else if (ms === 'megamenu') {
      const barH = 36;
      const items = ['Home', 'Products ▾', 'About', 'Contact'];
      const pw3 = (w - 20) / items.length - 6;
      for (let i = 0; i < items.length; i++) {
        rc.rectangle(x + 10 + i * (pw3 + 6), y + 4, pw3, barH - 8, {
          roughness: 0.6, fill: i === 1 ? '#c8d8ee' : '#f5f5f5', fillStyle: 'solid', stroke: '#88a', strokeWidth: 1
        });
        ctx.save();
        ctx.font = '10px monospace'; ctx.fillStyle = '#444';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(items[i], x + 10 + i * (pw3 + 6) + pw3 / 2, y + barH / 2);
        ctx.restore();
      }
      // Full-width panel
      const panelY = y + barH, panelH = h - barH;
      rc.rectangle(x, panelY, w, panelH, {
        roughness: 0.4, fill: '#f8f8f8', fillStyle: 'solid', stroke: '#bbb', strokeWidth: 1
      });
      const numCols = 3, colW = (w - 40) / numCols;
      for (let c = 0; c < numCols; c++) {
        const cx3 = x + 20 + c * (colW + 10);
        ctx.save();
        ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#333';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`Column ${c + 1}`, cx3, panelY + 10);
        ctx.font = '10px monospace'; ctx.fillStyle = '#666';
        for (let r = 0; r < 3; r++) ctx.fillText('— Link', cx3 + 6, panelY + 26 + r * 16);
        ctx.restore();
      }

    } else {
      // horizontal (default)
      const pills = 4, pw4 = (w - 20) / pills - 6;
      for (let i = 0; i < pills; i++) {
        rc.rectangle(x + 10 + i * (pw4 + 6), y + 10, pw4, h - 20,
          { roughness: 0.7, fill: '#c8d8ee', fillStyle: 'solid', stroke: '#88a', strokeWidth: 1 });
      }
    }

  } else if (node.patternHint === 'progress') {
    rc.rectangle(x, y, w, h, { ...opts, fill: '#f5f5f5', strokeWidth: 0.8 });
    const steps = 5, stepGap = (w - 40) / (steps - 1), mid = y + h / 2;
    ctx.save();
    // connecting line
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 20, mid); ctx.lineTo(x + 20 + stepGap * (steps - 1), mid); ctx.stroke();
    // active segment
    ctx.strokeStyle = '#5599cc';
    ctx.beginPath(); ctx.moveTo(x + 20, mid); ctx.lineTo(x + 20 + stepGap, mid); ctx.stroke();
    // dots
    for (let i = 0; i < steps; i++) {
      const sx = x + 20 + i * stepGap;
      ctx.beginPath(); ctx.arc(sx, mid, 8, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#5599cc' : '#eee'; ctx.fill();
      ctx.strokeStyle = i === 0 ? '#3377aa' : '#ccc'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '10px monospace'; ctx.fillStyle = i === 0 ? '#fff' : '#aaa';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), sx, mid);
    }
    ctx.restore();

  } else if (node.type === 'logo') {
    rc.rectangle(x + 4, y + 4, 32, h - 8, { ...opts, fill: '#c8b8e8', strokeWidth: 1.5 });
    rc.rectangle(x + 42, y + (h - 16) / 2, w - 50, 16, { roughness: 0.6, fill: '#ddd', fillStyle: 'solid', stroke: '#999', strokeWidth: 1 });
  } else {
    rc.rectangle(x, y, w, h, opts);
    drawLabel(node, x, y, w, h);

    if (node.layout === 'grid' && node._colWidths) {
      drawGridLines(node, x, y, w, h);
    }
  }

  hitBoxes.push({ node, x, y, w, h });

  if (node.children) {
    for (const child of node.children) renderTree(child);
  }
}

function drawGridLines(node, x, y, w, h) {
  const pad = PADDING[node.padding] || 0;
  const gap = GAP[node.gap] ?? 16;
  const innerX = node._innerX || (x + pad);
  const colOffsets = node._colOffsets;
  const colWidths = node._colWidths;

  for (let c = 1; c < colWidths.length; c++) {
    const lx = innerX + colOffsets[c] - gap / 2;
    rc.line(lx, y + pad, lx, y + h - pad,
      { roughness: 0.5, stroke: '#bbb', strokeWidth: 0.8, strokeLineDash: [5, 5] });
  }
}

// Uneven line widths so left/center/right alignment is clearly visible
const SQUIGGLE_FRACS = [0.92, 0.71, 0.86, 0.60, 0.95, 0.68, 0.80, 0.74, 0.89, 0.63];

function drawSquigglyLines(node, x, y, w, h) {
  if (w < 8 || h < 8) return;
  const align = node.align || 'left';
  const lineH = 13;
  const amp = 1.4;
  const freq = 7;
  const sel = node === selectedNode;
  ctx.save();
  ctx.strokeStyle = sel ? '#3366cc99' : '#bbb';
  let curY = y + 5;
  const maxY = y + h - 4;
  let lineIndex = 0;
  while (curY + 4 <= maxY) {
    const isLast = curY + lineH > maxY;
    const frac = isLast
      ? 0.22 + (lineIndex % 3) * 0.08
      : SQUIGGLE_FRACS[lineIndex % SQUIGGLE_FRACS.length];
    const lineW = Math.round(w * frac);
    // Alternate stroke weight slightly so the ragged edge reads clearly
    ctx.lineWidth = 0.9 + (lineIndex % 3) * 0.3;

    let startX;
    if (align === 'right') startX = x + w - lineW;
    else if (align === 'center') startX = x + (w - lineW) / 2;
    else startX = x + 1;

    ctx.beginPath();
    ctx.moveTo(startX, curY);
    for (let px = 0; px <= lineW; px += 2) {
      ctx.lineTo(startX + px, curY + Math.sin((startX + px) / freq) * amp);
    }
    ctx.stroke();
    curY += lineH;
    lineIndex++;
  }
  ctx.restore();
}

function drawLabel(node, x, y, w, h) {
  const label = LABELS[node.type] || node.type;
  ctx.save();
  ctx.font = FONT;
  ctx.fillStyle = node === selectedNode ? '#2244aa' : '#444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (['header', 'footer', 'section', 'div', 'article'].includes(node.type)) {
    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const layout = node.layout;
    const layoutSuffix = (layout === 'flex' || layout === 'grid') ? ` · ${layout}` : '';
    ctx.fillText(node.type + layoutSuffix, x + 6, y + 5);
  } else {
    const defaultAlign = node.type === 'button' ? 'center' : 'left';
    const textAlign = node.align || defaultAlign;
    ctx.textAlign = textAlign;
    const lx = textAlign === 'left' ? x + 8 : textAlign === 'right' ? x + w - 8 : x + w / 2;
    ctx.fillText(label, lx, y + h / 2);
  }
  ctx.restore();
}

function drawWelcomeMessage(margin, bodyW, totalH) {
  const cx = margin + bodyW / 2;
  const cy = totalH / 2 - 20;
  const boxW = Math.min(520, bodyW - 80);
  const boxH = 160;
  const bx = cx - boxW / 2;
  const by = cy - boxH / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(250, 250, 248, 0.92)';
  ctx.fillRect(bx - 4, by - 4, boxW + 8, boxH + 8);
  ctx.restore();

  rc.rectangle(bx, by, boxW, boxH, {
    roughness: 1.2,
    stroke: '#aaa',
    strokeWidth: 1.2,
    strokeLineDash: [8, 6],
    fill: 'transparent'
  });

  ctx.save();
  ctx.textAlign = 'center';

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#444';
  ctx.fillText('Welcome to Layout Builder', cx, by + 36);

  ctx.font = '13px monospace';
  ctx.fillStyle = '#888';
  const line1 = 'Sketch web layouts by placing HTML elements on a canvas.';
  const line2 = 'Drag elements from the left panel to start designing,';
  const line3 = 'or pick a starter template from the menu above.';
  ctx.fillText(line1, cx, by + 72);
  ctx.fillText(line2, cx, by + 94);
  ctx.fillText(line3, cx, by + 114);

  ctx.restore();
}

let stableImageData = null; // canvas snapshot before drag overlays

function drawDropIndicator() {
  if (!dropIndicator) return;
  const { parent, index } = dropIndicator;
  if (!parent || !parent._w) return;

  const children = parent.children || [];
  const pad = PADDING[parent.padding] || 0;
  const prev = index > 0 ? children[index - 1] : null;
  const next = index < children.length ? children[index] : null;

  let x1, y1, x2, y2;

  if (parent.layout === 'flex') {
    // Vertical bar between flex children
    y1 = parent._y + pad;
    y2 = parent._y + parent._h - pad;
    if (!prev)       x1 = x2 = parent._x + pad;
    else if (!next)  x1 = x2 = parent._x + parent._w - pad;
    else             x1 = x2 = (prev._x + prev._w + next._x) / 2;

  } else if (parent.layout === 'grid' && prev && next) {
    const sameRow = Math.abs(prev._y - next._y) < 4;
    if (sameRow) {
      // Vertical bar between siblings in the same grid row
      x1 = x2 = (prev._x + prev._w + next._x) / 2;
      y1 = Math.min(prev._y, next._y);
      y2 = Math.max(prev._y + prev._h, next._y + next._h);
    } else {
      // Horizontal bar between grid rows
      x1 = parent._x + pad; x2 = parent._x + parent._w - pad;
      y1 = y2 = (prev._y + prev._h + next._y) / 2;
    }
  } else if (parent.layout === 'grid' && !prev && next) {
    // Before first grid item: vertical bar to its left
    x1 = x2 = next._x;
    y1 = next._y; y2 = next._y + next._h;
  } else if (parent.layout === 'grid' && prev && !next) {
    // After last grid item: vertical bar to its right
    x1 = x2 = prev._x + prev._w;
    y1 = prev._y; y2 = prev._y + prev._h;
  } else {
    // Block (or empty grid): horizontal bar
    x1 = parent._x + pad;
    x2 = parent._x + parent._w - pad;
    if (!prev)      y1 = y2 = parent._y + pad;
    else if (!next) y1 = y2 = parent._y + parent._h - pad;
    else            y1 = y2 = (prev._y + prev._h + next._y) / 2;
  }

  ctx.save();
  ctx.strokeStyle = '#3366cc';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = '#3366cc';
  for (const [px, py] of [[x1, y1], [x2, y2]]) {
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Restore cached render and redraw only the drag overlays — avoids rough.js jitter.
function renderDragFrame() {
  if (!ctx || !stableImageData) { render(); return; }
  if (stableImageData.width !== canvas.width || stableImageData.height !== canvas.height) {
    render(); return;
  }
  ctx.putImageData(stableImageData, 0, 0);
  drawDropIndicator();
  if (canvasDragging && canvasDragNode) {
    const hb = hitBoxes.find(h => h.node === canvasDragNode);
    if (hb) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
      ctx.strokeStyle = '#3366cc60';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function render() {
  if (!rc) return;
  const viewport = pageTree.viewport || 1280;
  const rawW = pageTree.width;
  const bodyW = rawW === '100%' ? viewport : Math.min(parseInt(rawW) || 900, viewport);
  const margin = Math.round((viewport - bodyW) / 2);

  layoutTree(pageTree, margin, 0, bodyW);
  const totalH = Math.max(pageTree._h || 600, 600);

  if (canvas.width !== viewport || canvas.height !== totalH) {
    canvas.width = viewport;
    canvas.height = totalH;
    rc = rough.canvas(canvas);
  }

  ctx.clearRect(0, 0, viewport, totalH);
  if (margin > 0) {
    ctx.fillStyle = '#e6e4e0';
    ctx.fillRect(0, 0, margin, totalH);
    ctx.fillRect(viewport - margin, 0, margin, totalH);
  }
  ctx.fillStyle = '#fafaf8';
  ctx.fillRect(margin, 0, bodyW, totalH);

  ctx.fillStyle = '#c8c4c0';
  for (let gx = 24; gx < viewport; gx += 24) {
    for (let gy = 24; gy < totalH; gy += 24) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  hitBoxes.length = 0;
  layoutTree(pageTree, margin, 0, bodyW);

  renderTree(pageTree);

  if (!pageTree.children || pageTree.children.length === 0) {
    drawWelcomeMessage(margin, bodyW, totalH);
  }

  // Cache the stable render before drawing any drag overlays.
  // renderDragFrame() restores this snapshot so rough.js isn't re-run on every drag event.
  stableImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  drawDropIndicator();
  if (canvasDragging && canvasDragNode) {
    const hb = hitBoxes.find(h => h.node === canvasDragNode);
    if (hb) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
      ctx.strokeStyle = '#3366cc60';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  scaleCanvas();
  replaceHistoryState();
  buildDomTree();
  updateSemanticWarnings();
  saveLayout();
}

function scaleCanvas() {
  if (!canvas) return;
  const wrap = document.getElementById('canvas-wrap');
  const domPanel = document.getElementById('dom-tree-panel');
  // Subtract wrap's horizontal padding (32px each side) and the dom tree panel + its margin
  const available = wrap.clientWidth - 64 - domPanel.offsetWidth - 16;
  const scale = Math.min(1, available / canvas.width);
  if (scale < 1) {
    canvas.style.width  = Math.floor(canvas.width  * scale) + 'px';
    canvas.style.height = Math.floor(canvas.height * scale) + 'px';
  } else {
    canvas.style.width  = '';
    canvas.style.height = '';
  }
}
