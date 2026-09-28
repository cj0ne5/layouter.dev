function checkSemantics(tree) {
  const warnings = [];
  const children = tree.children || [];

  // Collect all nodes in document order (DFS)
  function allNodes(node) {
    const result = [node];
    for (const child of (node.children || [])) result.push(...allNodes(child));
    return result;
  }
  const all = allNodes(tree);

  function findParentType(tree, target) {
    function walk(node, parent) {
      if (node === target) return parent;
      for (const child of (node.children || [])) {
        const found = walk(child, node);
        if (found) return found;
      }
      return null;
    }
    return walk(tree, null);
  }

  // header must be first direct child of body
  const headerIdx = children.findIndex(c => c.type === 'header');
  if (headerIdx > 0) warnings.push('‹header› should be the first element inside ‹body›');

  // footer must be last direct child of body
  const footerIdx = children.findLastIndex(c => c.type === 'footer');
  if (footerIdx !== -1 && footerIdx !== children.length - 1) {
    warnings.push('‹footer› should be the last element inside ‹body›');
  }

  // Only one h1 per page
  const h1s = all.filter(n => n.type === 'h1');
  if (h1s.length === 0) warnings.push('Page has no ‹h1› — every page should have one main heading');
  if (h1s.length > 1) warnings.push(`Page has ${h1s.length} ‹h1› elements — there should only be one`);

  // Only one main per page, directly inside body, wrapping the sections
  const mains = all.filter(n => n.type === 'main');
  if (mains.length > 1) warnings.push(`Page has ${mains.length} ‹main› elements — there should only be one`);
  if (mains.some(m => !children.includes(m))) {
    warnings.push('‹main› should be directly inside ‹body›, between ‹header› and ‹footer›');
  }
  if (mains.length === 0 && all.some(n => n.type === 'section')) {
    warnings.push('Page has no ‹main› — wrap the main content (your ‹section›s) in a ‹main› element');
  }

  // section inside section
  function checkNestedSections(node, inSection) {
    if (node.type === 'section' && inSection) {
      warnings.push('‹section› is nested inside another ‹section› — consider using ‹div› or ‹article› instead');
      return;
    }
    for (const child of (node.children || [])) {
      checkNestedSections(child, inSection || node.type === 'section');
    }
  }
  checkNestedSections(tree, false);

  // article should have a heading (h1/h2/h3) inside it
  const articles = all.filter(n => n.type === 'article');
  for (const a of articles) {
    const hasHeading = allNodes(a).some(n => ['h1', 'h2', 'h3'].includes(n.type));
    if (!hasHeading) warnings.push('An ‹article› has no heading inside it — add an ‹h2› or ‹h3›');
  }

  for (const inlineNode of all.filter(n => INLINE_TYPES.includes(n.type))) {
    const parent = findParentType(tree, inlineNode);
    if (!parent || parent.type !== 'p') {
      warnings.push(`‹${inlineNode.type}› should be inside a ‹p› element`);
      break;
    }
  }
  const navs = all.filter(n => n.type === 'nav');
  for (const nav of navs) {
    // breadcrumbs and pagination navs belong in content areas, not header/footer
    if (nav.menuStyle === 'breadcrumbs' || nav.menuStyle === 'pagination') continue;
    const parent = findParentType(tree, nav);
    if (parent && !['header', 'footer', 'page'].includes(parent.type)) {
      warnings.push('‹nav› is not inside ‹header› or ‹footer›');
      break;
    }
  }

  // Heading level skips in document order (e.g., h1 -> h3)
  let lastHeadingLevel = 0;
  for (const n of all) {
    if (!/^h[1-6]$/.test(n.type)) continue;
    const level = parseInt(n.type.slice(1), 10);
    if (lastHeadingLevel && level > lastHeadingLevel + 1) {
      warnings.push(`Heading level skips from ‹h${lastHeadingLevel}› to ‹h${level}› — headings should step by one level`);
      break;
    }
    lastHeadingLevel = level;
  }

  // Empty landmarks
  const structureOnly = new Set(['page', 'main', 'section', 'header', 'footer', 'div', 'article']);
  function hasMeaningfulDescendant(node) {
    for (const child of (node.children || [])) {
      if (!structureOnly.has(child.type)) return true;
      if (hasMeaningfulDescendant(child)) return true;
    }
    return false;
  }
  for (const lm of all.filter(n => ['header', 'nav', 'main', 'section', 'footer'].includes(n.type))) {
    if (lm.type === 'nav') {
      if ((lm.children || []).length > 0) continue;
      const style = lm.menuStyle || 'horizontal';
      if (['horizontal', 'hamburger', 'dropdown', 'megamenu', 'breadcrumbs', 'pagination'].includes(style)) continue;
    }
    if (!hasMeaningfulDescendant(lm)) {
      warnings.push(`‹${lm.type}› appears empty — add meaningful content (headings, text, media, links, or controls)`);
    }
  }

  return [...new Set(warnings)]; // deduplicate
}

function updateSemanticWarnings() {
  const container = document.getElementById('semantic-warnings');
  if (!container) return;
  const warnings = checkSemantics(pageTree);
  if (warnings.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="sem-header">⚠ Semantic hints</div>
    ${warnings.map(w => `<div class="sem-warning">${w}</div>`).join('')}
  `;
}
