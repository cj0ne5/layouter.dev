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

  // nav not inside header or footer
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

  // h3 without a preceding h2 in the same container
  function checkHeadingOrder(node) {
    const kids = node.children || [];
    const types = kids.map(c => c.type);
    if (types.includes('h3') && !types.includes('h2') && !types.includes('h1')) {
      // only warn if there's no h1/h2 anywhere in the subtree above
      const hasH2Above = all.some(n => n.type === 'h2');
      if (!hasH2Above) warnings.push('‹h3› used without any ‹h1› or ‹h2› — headings should be in order');
    }
    for (const child of kids) checkHeadingOrder(child);
  }
  checkHeadingOrder(tree);

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
