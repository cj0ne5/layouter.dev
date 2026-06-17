function toggleYaml() {
  yamlOpen = !yamlOpen;
  const drawer = document.getElementById('yaml-drawer');
  const body = document.getElementById('yaml-body');
  const chevron = document.getElementById('yaml-chevron');
  if (yamlOpen) {
    drawer.style.height = '280px';
    body.style.display = 'flex';
    chevron.textContent = '▼';
    syncYaml();
  } else {
    drawer.style.height = '36px';
    body.style.display = 'none';
    chevron.textContent = '▲';
  }
}

function syncYaml() {
  if (!yamlOpen) return;
  const clean = stripInternal(JSON.parse(JSON.stringify(pageTree)));
  document.getElementById('yaml-editor').value = jsyaml.dump(clean, { indent: 2 });
  document.getElementById('yaml-error').textContent = '';
  document.getElementById('yaml-editor').classList.remove('error');
}

function stripInternal(node) {
  delete node._x; delete node._y; delete node._w; delete node._h;
  delete node._colWidths; delete node._colOffsets;
  delete node._rowHeights; delete node._rowOffsets;
  delete node._innerX;
  if (node.children) node.children.forEach(stripInternal);
  return node;
}

function applyYaml() {
  const text = document.getElementById('yaml-editor').value;
  try {
    const parsed = jsyaml.load(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid structure');
    pageTree = parsed;
    selectedNode = null;
    updatePropsPanel();
    render();
    document.getElementById('yaml-error').textContent = '';
    document.getElementById('yaml-editor').classList.remove('error');
  } catch (err) {
    document.getElementById('yaml-error').textContent = '⚠ ' + err.message;
    document.getElementById('yaml-editor').classList.add('error');
  }
}
