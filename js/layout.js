// Parse a CSS fr template string into pixel widths
function parseTemplate(template, totalPx, gap) {
  const parts = template.trim().split(/\s+/);
  const n = parts.length;
  const totalGap = gap * (n - 1);
  const available = Math.max(totalPx - totalGap, 0);
  const fixedTotal = parts.reduce((sum, p) => p.endsWith('px') ? sum + parseFloat(p) : sum, 0);
  const frAvailable = Math.max(available - fixedTotal, 0);
  const totalFr = parts.reduce((sum, p) => p.endsWith('fr') ? sum + parseFloat(p) : sum, 0);
  return parts.map(p => {
    if (p.endsWith('px')) return parseFloat(p);
    if (p.endsWith('fr') && totalFr > 0) return (parseFloat(p) / totalFr) * frAvailable;
    return available / n;
  });
}


function computeOffsets(sizes, gap) {
  const offsets = [0];
  for (let i = 0; i < sizes.length - 1; i++) offsets.push(offsets[i] + sizes[i] + gap);
  return offsets;
}

function layoutTree(node, x, y, w) {
  node._x = x; node._y = y; node._w = w;

  const pad = PADDING[node.padding] || 0;
  const gap = GAP[node.gap] ?? 16;
  const innerX = x + pad;
  const innerW = w - pad * 2;

  // p — height from text size; float img alongside or block img stacked above text
  if (node.type === 'p') {
    const textH = P_TEXT_H[node.text || 'sm'];
    const floatImg = (node.children || []).find(c => c.type === 'img' && c.float && c.float !== 'none');
    if (floatImg) {
      const fracs = { icon: 0.12, sm: 0.28, md: 0.38, lg: 0.52 };
      const imgW = Math.round(innerW * (fracs[floatImg.size] || 0.38));
      const imgH = Math.round(imgW * ({ portrait: 1.4, square: 1, landscape: 0.55 }[floatImg.aspect] || 0.55));
      floatImg._w = imgW; floatImg._h = imgH; floatImg._y = y + pad;
      floatImg._x = floatImg.float === 'left' ? innerX : innerX + innerW - imgW;
      floatImg._floated = true;
      node._h = Math.max(imgH, textH) + pad * 2;
    } else {
      // Stack any non-float children above the text area
      let childH = 0;
      if (node.children && node.children.length > 0) {
        let cy = y + pad;
        for (const child of node.children) {
          layoutTree(child, innerX, cy, innerW);
          cy += child._h + 8;
        }
        childH = cy - (y + pad);
      }
      node._h = childH + textH + pad * 2;
    }
    return;
  }

  if (node.type === 'img') {
    const aspectRatio = { portrait: 1.4, square: 1, landscape: 0.55 }[node.aspect] || 0.55;
    if (node.display === 'inline') {
      const frac = { icon: 0.1, sm: 0.3, md: 0.45, lg: 0.65 }[node.size] || 0.45;
      node._w = Math.round(w * frac);
    } else {
      // Block: size controls displayed width; image is centered in its cell
      const frac = { icon: 0.12, sm: 0.35, md: 0.65, lg: 1.0 }[node.size] || 0.65;
      node._w = Math.round(w * frac);
      node._x = Math.round(x + (w - node._w) / 2);
    }
    node._h = Math.round(node._w * aspectRatio);
    return;
  }

  // Nav height (and width for hamburger) varies by menu style
  if (node.type === 'nav') {
    const ms = node.menuStyle || 'horizontal';
    if (ms === 'hamburger') { node._w = 40; node._h = 40; return; }
    node._h = ms === 'megamenu' ? 160 : ms === 'dropdown' ? 80 : 36;
    return;
  }

  // Pattern hints are treated as leaves with fixed height
  if (node.patternHint === 'progress') {
    node._h = 60;
    return;
  }

  const leafH = { logo: 36, button: 36, h1: 36, h2: 28, h3: 22, input: 36, table: 140 };

  if (leafH[node.type] !== undefined) {
    node._h = leafH[node.type];
    return;
  }

  if (!node.children || node.children.length === 0) {
    node._h = 60;
    return;
  }

  const layout = node.layout || 'block';

  if (layout === 'grid') {
      const defaultCols = node.columns || 2;
      const template = node.colTemplate || Array(defaultCols).fill('1fr').join(' ');
      const colWidths = parseTemplate(template, innerW, gap);
      const actualCols = colWidths.length;
      const colOffsets = computeOffsets(colWidths, gap);

      let curY = y + pad;
      const rows = Math.ceil(node.children.length / actualCols);

      for (let r = 0; r < rows; r++) {
        let rowH = 0;
        for (let c = 0; c < actualCols; c++) {
          const i = r * actualCols + c;
          if (i >= node.children.length) break;
          layoutTree(node.children[i], innerX + colOffsets[c], curY, colWidths[c]);
          rowH = Math.max(rowH, node.children[i]._h);
        }
        for (let c = 0; c < actualCols; c++) {
          const i = r * actualCols + c;
          if (i < node.children.length && node.children[i].type !== 'img') node.children[i]._h = rowH;
        }
        curY += rowH + (r < rows - 1 ? gap : 0);
      }
      node._h = curY - y + pad;
      node._colWidths = colWidths;
      node._colOffsets = colOffsets;
      node._innerX = innerX;

  } else if (layout === 'flex') {
    const flexGap = gap;
    const align = node.align || 'start';
    const n = node.children.length;
    const cy = y + pad;
    let maxH = 0;

    if (n === 0) {
      node._h = 60;
    } else {
      const totalGapW = flexGap * (n - 1);
      // fullChildW: each item's natural equal-share width (used as reference for block imgs).
      // childW: shrunk to 65% so alignment gaps are visible.
      // Hamburger is always a fixed 40px slot regardless of container width.
      const fullChildW = Math.max(20, (innerW - totalGapW) / n);
      const childW    = Math.max(20, fullChildW * 0.65);

      // Per-child slot widths — sized to the element's actual displayed width
      // so the flex loop doesn't leave dead space after small elements.
      const BLOCK_IMG_FRAC = { icon: 0.12, sm: 0.35, md: 0.65, lg: 1.0 };
      const slotW = node.children.map(c => {
        if (c.type === 'nav' && c.menuStyle === 'hamburger') return 40;
        if (c.type === 'img' && c.display !== 'inline') {
          const frac = BLOCK_IMG_FRAC[c.size] || 0.65;
          return Math.min(Math.round(fullChildW * frac), childW);
        }
        return childW;
      });
      const totalSlotW = slotW.reduce((s, w) => s + w, 0);
      const freeW = Math.max(0, innerW - totalSlotW - totalGapW);
      const extraPerGap = (align === 'space-between' && n > 1) ? freeW / (n - 1) : 0;

      let startX;
      if (align === 'space-between' && n > 1) startX = innerX;
      else if (align === 'end')    startX = innerX + freeW;
      else if (align === 'center') startX = innerX + freeW / 2;
      else                         startX = innerX;

      let cx = startX;
      for (let i = 0; i < n; i++) {
        const child = node.children[i];
        const sw = slotW[i];
        const isBlockImg = child.type === 'img' && child.display !== 'inline';
        const isHamburger = child.type === 'nav' && child.menuStyle === 'hamburger';
        layoutTree(child, cx, cy, isBlockImg ? fullChildW : sw);
        if (isBlockImg) {
          // Slot is pre-sized to the img width, so cx is already the correct position.
          // Clamp _w as a safety net; alignment is expressed by where cx starts.
          child._w = Math.min(child._w, childW);
          child._x = cx;
          child._h = Math.round(child._w * ({ portrait: 1.4, square: 1, landscape: 0.55 }[child.aspect] || 0.55));
        } else if (isHamburger) {
          child._w = 40; child._h = 40;
          child._x = cx; // slot is already 40px, so just pin to leading edge
        }
        maxH = Math.max(maxH, child._h);
        cx += sw + flexGap + (i < n - 1 ? extraPerGap : 0);
      }
      for (const child of node.children) {
        const fixedH = child.type === 'img' || (child.type === 'nav' && child.menuStyle === 'hamburger');
        if (!fixedH) child._h = maxH;
      }
      node._h = maxH + pad * 2;
    }

  } else {
    // stack (vertical)
    let cy = y + pad;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      layoutTree(child, innerX, cy, innerW);
      cy += child._h + (i < node.children.length - 1 ? gap : 0);
    }
    node._h = cy - y + pad;
  }
}

function imgHeight(node, w) {
  const ratio = { portrait: 1.4, square: 1, landscape: 0.55 }[node.aspect] || 0.55;
  return Math.round(w * ratio);
}
