function updatePropsPanel() {
  const noSel = document.getElementById('no-selection');
  const fields = document.getElementById('prop-fields');
  if (!selectedNode) {
    noSel.style.display = ''; fields.style.display = 'none'; return;
  }
  noSel.style.display = 'none'; fields.style.display = '';
  fields.innerHTML = '';

  const n = selectedNode;

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
    addHint(fields, `Wraps sample words ${rs + 1} to ${re + 1}. To change the wrapped text, clear this inline tag and make a new word selection on the paragraph.`);
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
  if (['section', 'header', 'footer', 'div', 'article'].includes(n.type)) {
    addBtnGroup(fields, 'Layout', ['block', 'flex', 'grid'],
      n.layout || 'block',
      v => { n.layout = v; render(); updatePropsPanel(); });
  }

  // Grid-specific: column presets and areas
  if (n.layout === 'grid') {
    const defaultCols = n.columns || 3;
    const currentTemplate = n.colTemplate || Array(defaultCols).fill('1fr').join(' ');
    const colPresets = [
      { label: '1 col', value: '1fr' },
      { label: '2 equal', value: '1fr 1fr' },
      { label: '3 equal', value: '1fr 1fr 1fr' },
      { label: '4 equal', value: '1fr 1fr 1fr 1fr' },
      { label: 'sidebar + main', value: '250px 1fr' },
      { label: 'main + sidebar', value: '1fr 250px' },
      { label: 'holy grail', value: '250px 1fr 250px' },
    ];
    addPresetGroup(fields, 'Columns', colPresets, currentTemplate, v => {
      n.colTemplate = v;
      delete n.columns;
      render();
    });
  }

  // Flex align
  if (n.layout === 'flex') {
    addBtnGroup(fields, 'Align', ['start', 'center', 'end', 'space-between'],
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
    addBtnGroup(fields, 'Text', ['sm', 'md', 'lg'],
      n.text || 'sm',
      v => { n.text = v; render(); });
    addParagraphAnnotator(fields, n);
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
      n.padding || '1rem',
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
