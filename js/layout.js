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
    const children = node.children || [];
    for (const child of children) child._floated = false;
    const inlineChildren = children.filter(c => INLINE_TYPES.includes(c.type));
    const floatImg = children.find(c => c.type === 'img' && ((c.float && c.float !== 'none') || c.display === 'inline'));
    const blockChildren = children.filter(c => c !== floatImg && !INLINE_TYPES.includes(c.type));
    node._inlineFragments = [];
    node._textWords = [];

    function layoutInlineFragments(textX, textW, textTop, textHeight) {
      if (textW < 40 || textHeight < 12) return;

      const words = getParagraphLoremWords(node.text);
      const wordSize = node.text || 'sm';
      const textAlign = node.align || 'left';
      const fontPx = { sm: 11, md: 12, lg: 13 }[wordSize] || 12;
      const charW = fontPx * 0.58;
      const lineH = fontPx + 3;
      const wordH = fontPx;
      const wordGap = Math.max(3, Math.round(fontPx * 0.35));
      const maxBottom = textTop + textHeight - 2;
      const usableW = Math.max(12, textW - 4);

      // First, break words into lines based on available width.
      const lines = [];
      let curLine = [];
      let curLineW = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const ww = Math.round(word.length * charW + 4);
        const addW = curLine.length ? (wordGap + ww) : ww;
        if (curLine.length && curLineW + addW > usableW) {
          lines.push({ words: curLine, width: curLineW });
          curLine = [];
          curLineW = 0;
        }
        curLine.push({ index: i, text: word, w: ww });
        curLineW += curLine.length === 1 ? ww : addW;
      }
      if (curLine.length) lines.push({ words: curLine, width: curLineW });

      // Then place each line according to paragraph alignment.
      let wy = textTop + 4;
      for (const line of lines) {
        if (wy + wordH > maxBottom) break;

        let lineStartX = textX + 2;
        if (textAlign === 'center') {
          lineStartX = textX + 2 + Math.max(0, (usableW - line.width) / 2);
        } else if (textAlign === 'right') {
          lineStartX = textX + 2 + Math.max(0, usableW - line.width);
        }

        let wx = lineStartX;
        for (const w of line.words) {
          node._textWords.push({ index: w.index, text: w.text, x: Math.round(wx), y: wy, w: w.w, h: wordH });
          wx += w.w + wordGap;
        }

        wy += lineH;
      }

      if (!inlineChildren.length || !node._textWords.length) return;

      for (let i = 0; i < inlineChildren.length; i++) {
        const child = inlineChildren[i];
        if (child.startWord === undefined || child.endWord === undefined) {
          const fallbackWordIdx = Math.min(
            node._textWords.length - 1,
            Math.max(0, Math.floor(((i + 1) * node._textWords.length) / (inlineChildren.length + 1)))
          );
          const fallbackWord = node._textWords[fallbackWordIdx];
          child.startWord = fallbackWord.index;
          child.endWord = fallbackWord.index;
          if (!child.text) child.text = fallbackWord.text.replace(/[.,]/g, '');
        }

        let start = Math.max(0, Math.min(child.startWord, child.endWord));
        let end = Math.max(0, Math.max(child.startWord, child.endWord));
        if (start >= node._textWords.length) start = node._textWords.length - 1;
        if (end >= node._textWords.length) end = node._textWords.length - 1;

        const selWords = node._textWords.filter(wd => wd.index >= start && wd.index <= end);
        if (!selWords.length) continue;

        const boxes = [];
        let lineStart = selWords[0];
        let prev = selWords[0];

        for (let j = 1; j < selWords.length; j++) {
          const cur = selWords[j];
          const sameLine = Math.abs(cur.y - prev.y) <= 1;
          if (!sameLine) {
            boxes.push({
              x: lineStart.x,
              y: lineStart.y - 1,
              w: prev.x + prev.w - lineStart.x,
              h: 13
            });
            lineStart = cur;
          }
          prev = cur;
        }
        boxes.push({
          x: lineStart.x,
          y: lineStart.y - 1,
          w: prev.x + prev.w - lineStart.x,
          h: 13
        });

        const firstBox = boxes[0];
        child._x = firstBox.x;
        child._y = firstBox.y;
        child._w = firstBox.w;
        child._h = firstBox.h;
        child._boxes = boxes;

        const label = (child.text && child.text.trim()) || selWords.map(wd => wd.text).join(' ');
        node._inlineFragments.push({ node: child, text: label, type: child.type, boxes });
      }
    }

    if (floatImg) {
      const fracs = { icon: 0.12, sm: 0.28, md: 0.38, lg: 0.52 };
      const imgW = Math.round(innerW * (fracs[floatImg.size] || 0.38));
      const imgH = Math.round(imgW * ({ portrait: 1.4, square: 1, landscape: 0.55, banner: 0.38 }[floatImg.aspect] || 0.55));
      const effectiveFloat = (floatImg.float && floatImg.float !== 'none') ? floatImg.float : 'left';
      floatImg._w = imgW; floatImg._h = imgH; floatImg._y = y + pad;
      floatImg._x = effectiveFloat === 'left' ? innerX : innerX + innerW - imgW;
      floatImg._floated = true;
      floatImg._effectiveFloat = effectiveFloat;
      node._h = Math.max(imgH, textH) + pad * 2;
      const gap = 10;
      const textX = effectiveFloat === 'left' ? floatImg._x + floatImg._w + gap : innerX;
      const textRight = effectiveFloat === 'left' ? innerX + innerW : floatImg._x - gap;
      layoutInlineFragments(textX, Math.max(0, textRight - textX), y + pad, textH);
    } else {
      // Stack legacy non-inline children above the text area.
      let childH = 0;
      if (blockChildren.length > 0) {
        let cy = y + pad;
        for (const child of blockChildren) {
          layoutTree(child, innerX, cy, innerW);
          cy += child._h + 8;
        }
        childH = cy - (y + pad);
      }
      node._h = childH + textH + pad * 2;
      layoutInlineFragments(innerX, innerW, y + pad + childH, textH);
    }
    return;
  }

  if (node.type === 'img') {
    const aspectRatio = { portrait: 1.4, square: 1, landscape: 0.55, banner: 0.38 }[node.aspect] || 0.55;
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
          child._h = Math.round(child._w * ({ portrait: 1.4, square: 1, landscape: 0.55, banner: 0.38 }[child.aspect] || 0.55));
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

