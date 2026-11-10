function computeOffsets(sizes, gap) {
  const offsets = [0];
  for (let i = 0; i < sizes.length - 1; i++) offsets.push(offsets[i] + sizes[i] + gap);
  return offsets;
}

function layoutTree(node, x, y, w) {
  if (node.type === 'page') floatOverflowBottom = 0;
  // Floats from an enclosing block flow, handed down only to direct block-flow children
  const inheritedFloats = pendingFloatCtx;
  pendingFloatCtx = null;
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
      const imgW = Math.round(innerW * (IMG_INLINE_WIDTH[floatImg.size] || IMG_INLINE_WIDTH.md));
      const imgH = Math.round(imgW * (IMG_ASPECT[floatImg.aspect] || IMG_ASPECT.landscape));
      const effectiveFloat = (floatImg.float && floatImg.float !== 'none') ? floatImg.float : 'left';
      floatImg._w = imgW; floatImg._h = imgH; floatImg._y = y + pad;
      floatImg._x = effectiveFloat === 'left' ? innerX : innerX + innerW - imgW;
      floatImg._floated = true;
      floatImg._effectiveFloat = effectiveFloat;
      node._h = Math.max(imgH, textH) + pad * 2;
      const gap = FLOAT_MARGIN.side;
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
    const aspectRatio = IMG_ASPECT[node.aspect] || IMG_ASPECT.landscape;
    // Widths are a percentage of the containing block, as in the exported CSS.
    // Block images sit at the start (left) edge, like in a browser.
    if (node.display !== 'inline' && node.size === 'icon') {
      node._h = IMG_ICON_H;
      node._w = Math.round(IMG_ICON_H / aspectRatio);
      return;
    }
    node._w = Math.round(w * imgWidthFrac(node));
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

  const layout = node.layout || 'block';

  // Empty grids still lay out, so their rows and named areas are visible drop targets
  if ((!node.children || node.children.length === 0) && layout !== 'grid') {
    node._h = 60;
    return;
  }

  if (layout === 'grid') {
    node._h = layoutGrid(node, innerX, y + pad, innerW, gap) + pad * 2;

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
      const slotW = node.children.map(c => {
        if (c.type === 'nav' && c.menuStyle === 'hamburger') return 40;
        if (c.type === 'img') { // flex items are blockified, so inline imgs size the same way
          layoutTree(c, 0, 0, innerW);
          return c._w;
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
        const isBlockImg = child.type === 'img';
        const isHamburger = child.type === 'nav' && child.menuStyle === 'hamburger';
        layoutTree(child, cx, cy, isBlockImg ? innerW : sw);
        if (isBlockImg) {
          // Slot is pre-sized to the img width, so cx is already the correct position.
          child._w = sw;
          if (child.size !== 'icon') child._h = Math.round(sw * (IMG_ASPECT[child.aspect] || IMG_ASPECT.landscape));
          child._x = cx;
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
        else child._y = cy + (maxH - child._h) / 2; // align-items: center
      }
      node._h = maxH + pad * 2;
    }

  } else {
    // Normal flow (see layoutBlockFlow)
    const cy = layoutBlockFlow(node, innerX, y + pad, innerW, pad, inheritedFloats);
    node._h = cy - y + pad;
  }
}


function isInlineLevel(node) {
  return node.type === 'img' && node.display === 'inline' && (!node.float || node.float === 'none');
}

function isFloatedImg(node) {
  return node.type === 'img' && node.display === 'inline' && (node.float === 'left' || node.float === 'right');
}

function imgWidthFrac(node) {
  return node.display === 'inline'
    ? (IMG_INLINE_WIDTH[node.size] || IMG_INLINE_WIDTH.md)
    : (IMG_BLOCK_WIDTH[node.size] || IMG_BLOCK_WIDTH.md);
}

// Lowest float edge seen during this layout pass, so the canvas can grow to show
// floats that stick out of their (non-containing) parents.
let floatOverflowBottom = 0;
let pendingFloatCtx = null;

// Plain block containers share their parent's float context (their content flows
// around outside floats). Everything else is a block formatting context or a
// replaced element and avoids floats as a whole box.
function sharesFloatContext(node) {
  return ['main', 'section', 'header', 'footer', 'div', 'article'].includes(node.type)
    && (node.layout || 'block') === 'block' && !node.patternHint;
}

// Normal block flow, mirroring the browser:
//  - block children stack with no gap; only the exported default
//    margin-bottom of h1–h3 / p adds space
//  - inline images share line boxes (vertical-align: middle) and wrap
//  - floated images go to the left/right edge; following content flows beside them,
//    and the parent does NOT grow to contain them
// Returns the y just below the in-flow content.
function layoutBlockFlow(node, innerX, startY, innerW, pad, inheritedFloats) {
  const kids = node.children;
  const floats = inheritedFloats || [];
  const innerR = innerX + innerW;

  // Free horizontal band [l, r] for content between y and y + h
  const edgesAt = (y, h) => {
    let l = innerX, r = innerR;
    for (const f of floats) {
      if (f.top < y + h && f.bottom > y) {
        if (f.side === 'left') l = Math.max(l, f.right);
        else r = Math.min(r, f.left);
      }
    }
    return { l, r };
  };
  // Next y where some float ends (to move content down past floats)
  const nextFloatEnd = (y) => {
    const ends = floats.map(f => f.bottom).filter(b => b > y);
    return ends.length ? Math.min(...ends) : null;
  };

  let cy = startY;
  let line = null; // { y, items, w }

  const flushLine = () => {
    if (!line) return;
    const lineH = Math.max(...line.items.map(c => c._h));
    let cx = edgesAt(line.y, lineH).l;
    for (const c of line.items) {
      c._x = cx;
      c._y = line.y + (lineH - c._h) / 2;
      cx += c._w + INLINE_GAP;
    }
    cy = line.y + lineH;
    line = null;
  };

  kids.forEach((child, i) => {
    if (isFloatedImg(child)) {
      flushLine();
      layoutTree(child, innerX, cy, innerW);
      const need = child._w + FLOAT_MARGIN.side;
      let fy = cy;
      for (;;) {
        const { l, r } = edgesAt(fy, child._h);
        const next = nextFloatEnd(fy);
        if (r - l >= need || next === null) {
          child._x = child.float === 'left' ? l : r - child._w;
          break;
        }
        fy = next;
      }
      child._y = fy;
      floats.push({
        side: child.float, top: fy,
        bottom: fy + child._h + FLOAT_MARGIN.bottom,
        right: child._x + child._w + FLOAT_MARGIN.side,
        left: child._x - FLOAT_MARGIN.side,
      });
      floatOverflowBottom = Math.max(floatOverflowBottom, fy + child._h + FLOAT_MARGIN.bottom);
      return;
    }

    if (isInlineLevel(child)) {
      layoutTree(child, innerX, cy, innerW);
      if (line) {
        const { l, r } = edgesAt(line.y, Math.max(child._h, ...line.items.map(c => c._h)));
        if (l + line.w + INLINE_GAP + child._w > r) flushLine();
      }
      if (!line) {
        let ly = cy;
        for (;;) {
          const { l, r } = edgesAt(ly, child._h);
          const next = nextFloatEnd(ly);
          if (r - l >= child._w || next === null) break;
          ly = next;
        }
        line = { y: ly, items: [], w: -INLINE_GAP };
      }
      line.items.push(child);
      line.w += INLINE_GAP + child._w;
      return;
    }

    flushLine();
    if (sharesFloatContext(child)) {
      // Full-width box; its own content flows around the floats
      pendingFloatCtx = floats;
      layoutTree(child, innerX, cy, innerW);
      pendingFloatCtx = null;
    } else if (child.type === 'img') {
      // Replaced element: sits beside floats if it fits, otherwise drops below them
      layoutTree(child, innerX, cy, innerW);
      let iy = cy, l = innerX;
      for (;;) {
        const e = edgesAt(iy, child._h);
        const next = nextFloatEnd(iy);
        if (e.r - e.l >= child._w || next === null) { l = e.l; break; }
        iy = next;
      }
      child._x = l; child._y = iy;
      cy = iy;
    } else {
      // Text and other boxes are squeezed into the free band beside floats
      const { l, r } = edgesAt(cy, 1);
      layoutTree(child, l, cy, r - l);
    }
    cy += child._h;
    const isLastWithoutPad = i === kids.length - 1 && pad === 0; // margin collapses out of the parent
    if (['h1', 'h2', 'h3', 'p'].includes(child.type) && !isLastWithoutPad) cy += TEXT_MARGIN_BOTTOM;
  });
  flushLine();
  return cy;
}
