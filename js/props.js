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
    addBtnGroup(fields, 'Size', ['icon', 'sm', 'md', 'lg'],
      n.size || 'md',
      v => { n.size = v; render(); });
    addBtnGroup(fields, 'Aspect', ['portrait', 'square', 'landscape', 'banner'],
      n.aspect || 'landscape',
      v => { n.aspect = v; render(); });
    addHint(fields, 'Icon ≈ logo/favicon. Sizes are proportional to the parent — the same setting looks smaller in a narrow grid column than in a wide section.');
    addBtnGroup(fields, 'Display', ['block', 'inline'],
      n.display || 'block',
      v => { n.display = v; render(); updatePropsPanel(); });
    if (n.display === 'inline') {
      addBtnGroup(fields, 'Float', ['none', 'left', 'right'],
        n.float || 'none',
        v => { n.float = v; render(); });
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

function removeNode(tree, target) {
  if (!tree.children) return false;
  const i = tree.children.indexOf(target);
  if (i !== -1) { tree.children.splice(i, 1); return true; }
  for (const child of tree.children) {
    if (removeNode(child, target)) return true;
  }
  return false;
}
