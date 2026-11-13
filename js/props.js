function updatePropsPanel() {
  const noSel = document.getElementById('no-selection');
  const fields = document.getElementById('prop-fields');
  if (!selectedNode) {
    document.getElementById('props').classList.remove('wide');
    noSel.style.display = ''; fields.style.display = 'none'; return;
  }
  noSel.style.display = 'none'; fields.style.display = '';
  fields.innerHTML = '';

  const n = selectedNode;
  document.getElementById('props').classList.toggle('wide', n.layout === 'grid');

  if (n.type === 'page') {
    addPropLabel(fields, '‹body›');
    addBtnGroup(fields, 'Viewport', ['375', '768', '1280', '1440'],
      String(n.viewport || 1280),
      v => { n.viewport = parseInt(v); render(); });
    addBtnGroup(fields, 'Body width', ['600', '900', '1100', '100%'],
      String(n.width || 900),
      v => { n.width = v === '100%' ? '100%' : parseInt(v); render(); });
    return;
  }

  addPropLabel(fields, `‹${n.type}›`);
  addGridAreaPicker(fields, n);

  // Nav menu style
  if (n.type === 'nav') {
    addBtnGroup(fields, 'Menu style',
      ['horizontal', 'hamburger', 'dropdown', 'megamenu', 'breadcrumbs', 'pagination'],
      n.menuStyle || 'horizontal',
      v => { n.menuStyle = v; render(); });
    addDeleteBtn(fields, n);
    return;
  }

  if (INLINE_TYPES.includes(n.type)) {
    const rs = Math.min(n.startWord ?? 0, n.endWord ?? 0);
    const re = Math.max(n.startWord ?? 0, n.endWord ?? 0);
    addHint(fields, `Wraps words ${rs + 1} to ${re + 1} of the paragraph. To change which words, clear this inline tag and make a new word selection on the paragraph.`);
    if (n.type === 'a') {
      addTextInput(fields, 'Href', n.href || '#', v => {
        n.href = v || '#';
        render();
      });
    }
    addDeleteBtn(fields, n);
    return;
  }

  // Layout
  if (['main', 'section', 'header', 'footer', 'div', 'article'].includes(n.type)) {
    addBtnGroup(fields, 'Layout', ['block', 'flex', 'grid'],
      n.layout || 'block',
      v => {
        n.layout = v;
        if (v === 'grid' && !n.colTemplate && !n.areas) n.colTemplate = defaultColTemplate(n);
        render(); updatePropsPanel();
      });
  }

  // Grid-specific: presets, interactive area/track editor and a CSS text box
  if (n.layout === 'grid') {
    addGridPresets(fields, n);
    addGridEditor(fields, n);
  }

  // Flex align
  if (n.layout === 'flex') {
    addBtnGroup(fields, 'Align', ['start', 'center', 'end', 'space-between', 'space-around'],
      n.align || 'start',
      v => { n.align = v; render(); });
  }

  // Gap — only meaningful for flex and grid
  if (n.children && (n.layout === 'flex' || n.layout === 'grid')) {
    addBtnGroup(fields, 'Gap', ['0', '0.5rem', '1rem', '2rem'],
      n.gap ?? '1rem',
      v => { n.gap = v; render(); });
  }

  // Text size (p only)
  if (n.type === 'p') {
    addParagraphTextBox(fields, n);
    if (!n.content) {
      addBtnGroup(fields, 'Length', ['sm', 'md', 'lg'],
        n.text || 'sm',
        v => { n.text = v; render(); });
    }
    addParagraphAnnotator(fields, n);
  }

  if (n.type === 'button') {
    addTextInput(fields, 'Label', n.label || 'Click me', v => {
      if (v && v !== 'Click me') n.label = v; else delete n.label;
      render();
    });
  }

  // Text alignment (p and headings)
  if (['p', 'h1', 'h2', 'h3'].includes(n.type)) {
    addBtnGroup(fields, 'Align', ['left', 'center', 'right'],
      n.align || 'left',
      v => { n.align = v; render(); });
  }

  // Padding
  if (n.type !== 'img' && n.type !== 'p' && n.type !== 'h1' && n.type !== 'h2' && n.type !== 'h3') {
    addBtnGroup(fields, 'Padding', ['0', '0.5rem', '1rem', '2rem'],
      n.padding || (n.type === 'button' ? '0.5rem' : '1rem'),
      v => { n.padding = v; render(); });
  }

  // Image props
  if (n.type === 'img') {
    const parent = findParent(pageTree, n);
    const inParagraph = !!parent && parent.type === 'p';
    addBtnGroup(fields, 'Size', ['icon', 'sm', 'md', 'lg'],
      n.size || 'md',
      v => { n.size = v; render(); });
    addBtnGroup(fields, 'Aspect', ['portrait', 'square', 'landscape', 'banner'],
      n.aspect || 'landscape',
      v => { n.aspect = v; render(); });
    addHint(fields, 'Icon ≈ logo/favicon. Sizes are proportional to the parent — the same setting looks smaller in a narrow grid column than in a wide section.');
    addBtnGroup(fields, 'Display', ['block', 'inline'],
      n.display || 'block',
      v => {
        n.display = v;
        if (inParagraph && v === 'inline' && (!n.float || n.float === 'none')) n.float = 'left';
        render();
        updatePropsPanel();
      });
    if (n.display === 'inline') {
      const floatOptions = inParagraph ? ['left', 'right'] : ['none', 'left', 'right'];
      const currentFloat = inParagraph
        ? ((n.float === 'right') ? 'right' : 'left')
        : (n.float || 'none');
      addBtnGroup(fields, 'Float', floatOptions,
        currentFloat,
        v => { n.float = v; render(); });
      if (inParagraph) {
        addHint(fields, 'Inside paragraphs, inline images are shown as text-wrapping media (left/right). Use block display to stack images above text.');
      }
    }
  }

  // Input props
  if (n.type === 'input') {
    addBtnGroup(fields, 'Label', ['none', 'inline'],
      n.showLabel ? 'inline' : 'none',
      v => { n.showLabel = (v === 'inline'); render(); });
  }

  addDeleteBtn(fields, n);
}

function defaultInlineText(type) {
  if (type === 'a') return 'Learn more';
  if (type === 'strong') return 'Important';
  if (type === 'u') return 'Underline';
  if (type === 'em') return 'Emphasis';
  return 'inline text';
}

function getParagraphSelectionRange(paragraph) {
  if (!paragraphSelection || paragraphSelection.paragraph !== paragraph) return null;
  const words = paragraph._textWords || [];
  if (!words.length) return null;
  const maxIdx = words[words.length - 1].index;
  const start = Math.max(0, Math.min(paragraphSelection.start, paragraphSelection.end, maxIdx));
  const end = Math.max(0, Math.min(Math.max(paragraphSelection.start, paragraphSelection.end), maxIdx));
  return { start, end };
}

function rangesOverlap(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

function getSelectedWordsText(paragraph, range) {
  const words = (paragraph._textWords || [])
    .filter(w => w.index >= range.start && w.index <= range.end)
    .map(w => w.text);
  return words.join(' ');
}

function applyInlineToSelection(paragraph, type) {
  const range = getParagraphSelectionRange(paragraph);
  if (!range) return;

  const wordsText = getSelectedWordsText(paragraph, range);
  if (!wordsText) return;

  pushHistoryState();
  if (!paragraph.children) paragraph.children = [];

  paragraph.children = paragraph.children.filter(child => {
    if (!INLINE_TYPES.includes(child.type)) return true;
    const childRange = {
      start: Math.min(child.startWord ?? 0, child.endWord ?? 0),
      end: Math.max(child.startWord ?? 0, child.endWord ?? 0)
    };
    return !rangesOverlap(range, childRange);
  });

  const inlineNode = { type, text: wordsText.replace(/[.,]$/, ''), startWord: range.start, endWord: range.end };
  if (type === 'a') inlineNode.href = '#';
  paragraph.children.push(inlineNode);
  paragraph.children.sort((a, b) => (a.startWord ?? -1) - (b.startWord ?? -1));

  selectedNode = paragraph;
  render();
  updatePropsPanel();
}

function clearInlineInSelection(paragraph) {
  const range = getParagraphSelectionRange(paragraph);
  if (!range || !paragraph.children) return;

  const before = paragraph.children.length;
  const kept = paragraph.children.filter(child => {
    if (!INLINE_TYPES.includes(child.type)) return true;
    const childRange = {
      start: Math.min(child.startWord ?? 0, child.endWord ?? 0),
      end: Math.max(child.startWord ?? 0, child.endWord ?? 0)
    };
    return !rangesOverlap(range, childRange);
  });
  if (kept.length === before) return;

  pushHistoryState();
  paragraph.children = kept;
  selectedNode = paragraph;
  render();
  updatePropsPanel();
}

function clearAllInlineInParagraph(paragraph) {
  if (!paragraph.children) return;
  const hasInline = paragraph.children.some(c => INLINE_TYPES.includes(c.type));
  if (!hasInline) return;

  pushHistoryState();
  paragraph.children = paragraph.children.filter(c => !INLINE_TYPES.includes(c.type));
  paragraphSelection = null;
  selectedNode = paragraph;
  render();
  updatePropsPanel();
}

// Free-text box for a paragraph. Blank = lorem ipsum placeholder text.
function addParagraphTextBox(parent, n) {
  const group = document.createElement('div');
  group.className = 'prop-group';
  group.innerHTML = '<label>Text</label>';
  const box = document.createElement('textarea');
  box.rows = 3;
  box.placeholder = 'Type your own words, or leave blank for lorem ipsum';
  box.value = n.content || '';
  box.style.cssText = 'width:100%; box-sizing:border-box; font:inherit; font-size:12px; padding:6px; border:1px solid #ccc; border-radius:5px; resize:vertical;';
  let saved = false; // one undo step per editing session
  box.addEventListener('focus', () => { saved = false; });
  box.addEventListener('input', () => {
    if (!saved) { pushHistoryState(); saved = true; }
    const text = box.value.trim();
    if (text) n.content = text; else delete n.content;
    syncInlineTagsToWords(n);
    if (paragraphSelection && paragraphSelection.paragraph === n) paragraphSelection = null;
    render();
  });
  // Refresh the panel once editing finishes (e.g. show/hide the Length buttons)
  box.addEventListener('change', () => updatePropsPanel());
  group.appendChild(box);
  parent.appendChild(group);
}

// After the words change, drop inline tags that fall off the end and relabel the rest.
function syncInlineTagsToWords(paragraph) {
  if (!paragraph.children) return;
  const words = getParagraphWords(paragraph);
  paragraph.children = paragraph.children.filter(child => {
    if (!INLINE_TYPES.includes(child.type)) return true;
    const start = Math.min(child.startWord ?? 0, child.endWord ?? 0);
    const end = Math.min(Math.max(child.startWord ?? 0, child.endWord ?? 0), words.length - 1);
    if (start >= words.length) return false;
    child.startWord = start;
    child.endWord = end;
    child.text = words.slice(start, end + 1).join(' ').replace(/[.,]$/, '');
    return true;
  });
}

function addParagraphAnnotator(parent, paragraph) {
  const group = document.createElement('div');
  group.className = 'prop-group';
  group.innerHTML = '<label>Inline annotate</label>';

  const hint = document.createElement('div');
  hint.className = 'prop-hint';
  hint.style.margin = '0 0 8px 0';
  hint.textContent = 'Drag across words in this paragraph, then apply a tag.';
  group.appendChild(hint);

  const range = getParagraphSelectionRange(paragraph);
  const selectionPreview = document.createElement('div');
  selectionPreview.style.cssText = 'font-size:11px; color:#666; margin-bottom:8px; min-height:16px;';
  selectionPreview.textContent = range
    ? `Selection: "${getSelectedWordsText(paragraph, range)}"`
    : 'Selection: none';
  group.appendChild(selectionPreview);

  const actions = document.createElement('div');
  actions.className = 'btn-group';
  const buttons = [
    ['Link', 'a'],
    ['Strong', 'strong'],
    ['Underline', 'u'],
    ['Emphasis', 'em'],
    ['Span', 'span']
  ];

  for (const [label, type] of buttons) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = !range;
    btn.onclick = () => applyInlineToSelection(paragraph, type);
    actions.appendChild(btn);
  }
  group.appendChild(actions);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear formatting in selection';
  clearBtn.disabled = !range;
  clearBtn.style.cssText = 'margin-top:8px; width:100%; padding:6px; border:1px solid #ddd; border-radius:5px; background:#fafafa; color:#555; cursor:pointer; font-size:12px;';
  clearBtn.onclick = () => clearInlineInSelection(paragraph);
  group.appendChild(clearBtn);

  const resetAllBtn = document.createElement('button');
  resetAllBtn.textContent = 'Reset all inline tags in paragraph';
  resetAllBtn.style.cssText = 'margin-top:6px; width:100%; padding:6px; border:1px solid #e6d9aa; border-radius:5px; background:#fffdf6; color:#6b5a2b; cursor:pointer; font-size:12px;';
  resetAllBtn.onclick = () => clearAllInlineInParagraph(paragraph);
  group.appendChild(resetAllBtn);

  parent.appendChild(group);
}

function addDeleteBtn(fields, n) {
  const btn = document.createElement('button');
  btn.textContent = '✕ Remove element';
  btn.style.cssText = 'margin-top:16px; width:100%; padding:6px; border:1px solid #e88; border-radius:5px; background:#fff5f5; color:#c44; cursor:pointer; font-size:12px;';
  btn.onclick = () => { pushHistoryState(); removeNode(pageTree, n); selectedNode = null; updatePropsPanel(); render(); };
  fields.appendChild(btn);
}

function findParent(tree, target) {
  if (!tree.children) return null;
  for (const child of tree.children) {
    if (child === target) return tree;
    const found = findParent(child, target);
    if (found) return found;
  }
  return null;
}

function addPropLabel(parent, text) {
  const el = document.createElement('div');
  el.style.cssText = 'font-weight:600; font-size:13px; margin-bottom:10px; color:#333; font-family:monospace;';
  el.textContent = text;
  parent.appendChild(el);
}

function addBtnGroup(parent, label, options, current, onChange) {
  const group = document.createElement('div');
  group.className = 'prop-group';
  group.innerHTML = `<label>${label}</label><div class="btn-group"></div>`;
  const btnRow = group.querySelector('.btn-group');
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.textContent = opt;
    if (opt === current) btn.classList.add('active');
    btn.onclick = () => {
      pushHistoryState();
      btnRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(opt);
    };
    btnRow.appendChild(btn);
  }
  parent.appendChild(group);
}

function addPresetGroup(parent, label, presets, current, onChange) {
  const group = document.createElement('div');
  group.className = 'prop-group';
  group.innerHTML = `<label>${label}</label><div class="btn-group preset-cols"></div>`;
  const btnRow = group.querySelector('.btn-group');
  for (const preset of presets) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.title = preset.value;
    if (preset.value === current) btn.classList.add('active');
    btn.onclick = () => {
      pushHistoryState();
      btnRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(preset.value);
    };
    btnRow.appendChild(btn);
  }
  parent.appendChild(group);
}

function addHint(parent, text) {
  const el = document.createElement('div');
  el.className = 'prop-hint';
  el.textContent = text;
  parent.appendChild(el);
}

function addTextInput(parent, label, current, onChange) {
  const group = document.createElement('div');
  group.className = 'prop-group';
  group.innerHTML = `<label>${label}</label>`;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current || '';
  input.addEventListener('change', () => {
    pushHistoryState();
    onChange(input.value.trim());
  });
  group.appendChild(input);
  parent.appendChild(group);
}

function removeNode(tree, target) {
  if (!tree.children) return false;
  const i = tree.children.indexOf(target);
  if (i !== -1) { tree.children.splice(i, 1); return true; }
  for (const child of tree.children) {
    if (removeNode(child, target)) return true;
  }
  return false;
}

// ---------- Grid editing ----------

const GRID_AREA_PRESETS = [
  { label: "header / menu + main / footer", areas: ['head head', 'menu main', 'foot foot'], rowTemplate: '100px 1fr 200px', colTemplate: '200px 1fr' },
  { label: 'holy grail (3 columns)', areas: ['head head head', 'nav main aside', 'foot foot foot'], rowTemplate: 'auto 1fr auto', colTemplate: '200px 1fr 200px' },
  { label: 'hero + 2 cards', areas: ['hero hero', 'left right'], rowTemplate: '300px auto', colTemplate: '1fr 1fr' },
];

const GRID_COL_PRESETS = [
  { label: '2 equal', value: '1fr 1fr' },
  { label: '3 equal', value: '1fr 1fr 1fr' },
  { label: '4 equal', value: '1fr 1fr 1fr 1fr' },
  { label: 'sidebar + main', value: '250px 1fr' },
  { label: 'main + sidebar', value: '1fr 250px' },
  { label: 'holy grail', value: '250px 1fr 250px' },
];

function addGridPresets(fields, n) {
  const group = document.createElement('div');
  group.className = 'prop-group';
  group.innerHTML = '<label>Grid presets</label>';
  const sel = document.createElement('select');
  sel.innerHTML = '<option value="">Choose a preset…</option>' +
    '<optgroup label="Named areas">' +
    GRID_AREA_PRESETS.map((p, i) => `<option value="a${i}">${p.label}</option>`).join('') +
    '</optgroup><optgroup label="Columns only">' +
    GRID_COL_PRESETS.map((p, i) => `<option value="c${i}">${p.label} — ${p.value}</option>`).join('') +
    '</optgroup>';
  sel.onchange = () => {
    const v = sel.value;
    if (!v) return;
    pushHistoryState();
    const idx = parseInt(v.slice(1));
    if (v[0] === 'a') {
      const p = GRID_AREA_PRESETS[idx];
      n.areas = p.areas.slice(); n.rowTemplate = p.rowTemplate; n.colTemplate = p.colTemplate;
      // Drop stale area assignments; place existing children into the new areas in order
      const names = p.areas.join(' ').split(/\s+/).filter((x, i, arr) => x !== '.' && arr.indexOf(x) === i);
      (n.children || []).forEach((c, i) => { if (names[i]) c.gridArea = names[i]; else delete c.gridArea; });
    } else {
      n.colTemplate = GRID_COL_PRESETS[idx].value;
      delete n.rowTemplate; delete n.areas; delete n.columns;
      (n.children || []).forEach(c => delete c.gridArea);
    }
    render();
    updatePropsPanel();
  };
  group.appendChild(sel);
  fields.appendChild(group);
}

// Widget state <-> node
function gridEditorModel(n) {
  const area = n.areas && n.areas.length ? n.areas.map(areaRowCells) : [];
  const rows = safeExpandTracks(n.rowTemplate || '');
  const cols = safeExpandTracks(n.colTemplate || (n.areas ? '' : defaultColTemplate(n)));
  const nRows = Math.max(area.length, rows.length, 1);
  const nCols = Math.max(...area.map(r => r.length), cols.length, 1);
  const cells = [];
  for (let r = 0; r < nRows; r++) {
    cells.push([]);
    for (let c = 0; c < nCols; c++) cells[r].push((area[r] && area[r][c]) || '.');
  }
  return {
    cells,
    rows: Array.from({ length: nRows }, (_, r) => rows[r] || 'auto'),
    cols: Array.from({ length: nCols }, (_, c) => cols[c] || 'auto'),
  };
}

function applyGridEditorModel(n, m) {
  const hasAreas = m.cells.some(row => row.some(c => c !== '.'));
  if (hasAreas) n.areas = m.cells.map(row => row.join(' '));
  else delete n.areas;
  n.colTemplate = m.cols.join(' ');
  if (!hasAreas && m.rows.length === 1 && m.rows[0] === 'auto') delete n.rowTemplate;
  else n.rowTemplate = m.rows.join(' ');
  delete n.columns;
}

function addGridEditor(fields, n) {
  const group = document.createElement('div');
  group.className = 'prop-group grid-editor';
  group.innerHTML = `<label>Grid areas &amp; track sizes</label>
    <div class="prop-hint grid-editor-hint">Type an area name in each cell (blank = <code>.</code>). Repeat a name to span cells. Row sizes on the right, column sizes below.</div>`;
  const table = document.createElement('div');
  table.className = 'grid-cells';
  const btns = document.createElement('div');
  btns.className = 'btn-group grid-editor-btns';
  const msg = document.createElement('div');
  msg.className = 'grid-msg';
  const cssLabel = document.createElement('label');
  cssLabel.textContent = 'CSS (type or paste)';
  cssLabel.style.marginTop = '10px';
  const css = document.createElement('textarea');
  css.className = 'grid-css';
  css.spellcheck = false;
  css.rows = 7;
  const cssMsg = document.createElement('div');
  cssMsg.className = 'grid-msg';
  group.append(table, btns, msg, cssLabel, css, cssMsg);
  fields.appendChild(group);

  let model = gridEditorModel(n);
  // One undo step per focused editing session
  let historyPushed = false;
  const beginEdit = () => { if (!historyPushed) { pushHistoryState(); historyPushed = true; } };
  const endEdit = () => { historyPushed = false; };

  function cssText() {
    return gridTemplateDecls(n).map(d => d + ';').join('\n');
  }

  function showStatus() {
    const cfg = getGridConfig(n);
    msg.textContent = cfg.invalid ? '⚠ ' + cfg.invalid + ' A browser would ignore the whole grid template.' : '';
    msg.classList.toggle('error', !!cfg.invalid);
  }

  let cellInputs = [];
  function recolorCells() {
    const names = [];
    model.cells.forEach(row => row.forEach(c => { if (c !== '.' && !names.includes(c)) names.push(c); }));
    for (const { inp, r, c } of cellInputs) {
      const name = model.cells[r][c];
      inp.style.background = name === '.' ? '' : areaColor(name, names);
    }
  }

  function commit() {
    applyGridEditorModel(n, model);
    recolorCells();
    if (document.activeElement !== css) { css.value = cssText(); cssMsg.textContent = ''; }
    showStatus();
    render();
  }

  function sizeInput(value, onInput) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'grid-size';
    inp.value = value === 'auto' ? '' : value;
    inp.placeholder = 'auto';
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('blur', endEdit);
    inp.addEventListener('input', () => {
      const v = inp.value.trim() || 'auto';
      let ok = true;
      try { if (expandTracks(v).length !== 1) ok = false; } catch (_) { ok = false; }
      inp.classList.toggle('bad', !ok);
      if (!ok) return;
      beginEdit();
      onInput(v);
      commit();
    });
    return inp;
  }

  function buildTable() {
    table.innerHTML = '';
    const nCols = model.cols.length;
    table.style.gridTemplateColumns = `repeat(${nCols}, minmax(0, 1fr)) 52px`;
    cellInputs = [];

    model.cells.forEach((row, r) => {
      row.forEach((name, c) => {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'grid-cell';
        inp.value = name === '.' ? '' : name;
        inp.placeholder = '.';
        cellInputs.push({ inp, r, c });
        inp.addEventListener('focus', () => inp.select());
        inp.addEventListener('blur', endEdit);
        inp.addEventListener('input', () => {
          beginEdit();
          const v = inp.value.replace(/['"\s]/g, '');
          model.cells[r][c] = v === '' || /^\.+$/.test(v) ? '.' : v;
          commit();
        });
        table.appendChild(inp);
      });
      table.appendChild(sizeInput(model.rows[r], v => { model.rows[r] = v; }));
    });
    model.cols.forEach((size, c) => {
      table.appendChild(sizeInput(size, v => { model.cols[c] = v; }));
    });
    const corner = document.createElement('div');
    corner.className = 'grid-corner';
    corner.textContent = '↑ rows';
    table.appendChild(corner);
    recolorCells();
  }

  function addBtn(label, title, fn) {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    b.onclick = () => {
      pushHistoryState();
      fn();
      applyGridEditorModel(n, model);
      model = gridEditorModel(n);
      buildTable();
      commit();
    };
    btns.appendChild(b);
  }
  addBtn('+ row', 'Add a row', () => {
    model.cells.push(model.cols.map(() => '.'));
    model.rows.push('auto');
  });
  addBtn('− row', 'Remove the last row', () => {
    if (model.rows.length <= 1) return;
    model.cells.pop(); model.rows.pop();
  });
  addBtn('+ col', 'Add a column', () => {
    model.cells.forEach(row => row.push('.'));
    model.cols.push('1fr');
  });
  addBtn('− col', 'Remove the last column', () => {
    if (model.cols.length <= 1) return;
    model.cells.forEach(row => row.pop()); model.cols.pop();
  });

  css.value = cssText();
  css.addEventListener('blur', () => {
    endEdit();
    try { parseGridCSS(css.value); css.value = cssText(); cssMsg.textContent = ''; css.classList.remove('bad'); } catch (_) { /* keep the user's text so they can fix it */ }
  });
  css.addEventListener('input', () => {
    let parsed;
    try {
      parsed = parseGridCSS(css.value);
    } catch (err) {
      cssMsg.textContent = '⚠ ' + err.message;
      cssMsg.classList.add('error');
      css.classList.add('bad');
      return;
    }
    beginEdit();
    cssMsg.textContent = '✓ applied';
    cssMsg.classList.remove('error');
    css.classList.remove('bad');
    if (parsed.areas) n.areas = parsed.areas; else delete n.areas;
    if (parsed.rowTemplate) n.rowTemplate = parsed.rowTemplate; else delete n.rowTemplate;
    if (parsed.colTemplate) n.colTemplate = parsed.colTemplate; else delete n.colTemplate;
    if (!n.colTemplate && !n.areas) n.colTemplate = 'auto';
    if (parsed.gap !== undefined) n.gap = parsed.gap;
    delete n.columns;
    model = gridEditorModel(n);
    buildTable();
    showStatus();
    render();
  });

  buildTable();
  showStatus();
}

// For children of a grid container: choose which named area they occupy
function addGridAreaPicker(fields, n) {
  const parent = findParent(pageTree, n);
  if (!parent || parent.layout !== 'grid') return;
  const names = gridAreaNames(parent);
  if (!names.length && !n.gridArea) return;
  const current = n.gridArea || 'auto';
  addBtnGroup(fields, 'grid-area', ['auto', ...names], names.includes(current) ? current : 'auto', v => {
    if (v === 'auto') delete n.gridArea;
    else {
      // Only one element per area: bump whoever was there back to auto-placement
      (parent.children || []).forEach(c => { if (c !== n && c.gridArea === v) delete c.gridArea; });
      n.gridArea = v;
    }
    render();
  });
  if (n.gridArea && !names.includes(n.gridArea)) {
    addHint(fields, `The parent grid has no area named "${n.gridArea}", so this element is auto-placed.`);
  }
}
