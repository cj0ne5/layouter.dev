function collectUsedTypes(node, out = new Set()) {
  out.add(node.type);
  for (const c of node.children || []) collectUsedTypes(c, out);
  return out;
}

function exportHTML() {
  const clean = JSON.parse(JSON.stringify(pageTree));
  stripInternal(clean);
  const used = collectUsedTypes(clean);

  const bodyWidth = clean.width || 900;
  const bodyWidthCSS = bodyWidth === '100%' ? '100%' : `${bodyWidth}px`;

  // --- CSS class collector ---
  let classCounter = 0;
  const generatedRules = []; // [selector, decl[]]

  function emitClass(decls) {
    if (!decls.length) return '';
    const name = `c${++classCounter}`;
    generatedRules.push([`.${name}`, decls]);
    return name;
  }

  // --- HTML generator ---
  function nodeToHTML(node, depth = 0) {
    const ind = '  '.repeat(depth);

    const tagMap = {
      header: 'header', footer: 'footer', section: 'section',
      div: 'div', article: 'article', nav: 'nav', logo: 'div',
      h1: 'h1', h2: 'h2', h3: 'h3',
      p: 'p', img: 'img', button: 'button',
      input: 'input', table: 'table', page: null,
    };
    const tag = node.type in tagMap ? tagMap[node.type] : 'div';
    if (!tag) {
      return (node.children || []).map(c => nodeToHTML(c, depth)).join('\n');
    }

    // Build per-element CSS declarations
    const decls = [];

    if (node.layout === 'grid') {
      decls.push('display: grid');
      const cols = node.colTemplate || `repeat(${node.columns || 3}, 1fr)`;
      decls.push(`grid-template-columns: ${cols}`);
      if (node.gap && node.gap !== '0') decls.push(`gap: ${node.gap}`);
    } else if (node.layout === 'flex') {
      decls.push('display: flex');
      decls.push('align-items: center');
      if (node.align === 'space-between') decls.push('justify-content: space-between');
      else if (node.align && node.align !== 'start') decls.push(`justify-content: ${node.align}`);
      if (node.gap && node.gap !== '0') decls.push(`gap: ${node.gap}`);
    }

    if (node.padding && node.padding !== '0') decls.push(`padding: ${node.padding}`);

    if (['p', 'h1', 'h2', 'h3'].includes(node.type) && node.align && node.align !== 'left') {
      decls.push(`text-align: ${node.align}`);
    }

    if (node.type === 'img') {
      const aspectRatio = { portrait: '3 / 4', square: '1', landscape: '4 / 3', banner: '8 / 3' }[node.aspect] || '4 / 3';
      if (node.display === 'inline') {
        const sizeW = { icon: '10%', sm: '30%', md: '45%', lg: '65%' };
        decls.push(`width: ${sizeW[node.size] || '45%'}`);
        decls.push(`aspect-ratio: ${aspectRatio}`);
        if (node.float && node.float !== 'none') {
          decls.push(`float: ${node.float}`);
          decls.push(node.float === 'left' ? 'margin: 0 1rem 0.5rem 0' : 'margin: 0 0 0.5rem 1rem');
        }
      } else if (node.size === 'icon') {
        // Explicit width+height so the grey background shows even when src is missing.
        // (width: auto on a broken img computes to 0 — invisible.)
        const [wr, hr] = { portrait: [3, 4], square: [1, 1], landscape: [4, 3] }[node.aspect] || [4, 3];
        decls.push(`height: 2.5rem`);
        decls.push(`width: ${+(2.5 * wr / hr).toFixed(2)}rem`);
      } else {
        decls.push(`aspect-ratio: ${aspectRatio}`);
      }
    }

    const className = emitClass(decls);
    const classAttr = className ? ` class="${className}"` : '';

    // --- Leaf / special nodes ---
    if (node.type === 'img') {
      return `${ind}<img src="placeholder.jpg" alt=""${classAttr}>`;
    }

    if (node.type === 'input') {
      if (node.showLabel) {
        return `${ind}<label>Label <input type="text" placeholder="Enter text"></label>`;
      }
      return `${ind}<input type="text" placeholder="Enter text">`;
    }

    if (node.type === 'table') {
      return [
        `${ind}<table>`,
        `${ind}  <thead>`,
        `${ind}    <tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr>`,
        `${ind}  </thead>`,
        `${ind}  <tbody>`,
        `${ind}    <tr><td>Row 1</td><td>Row 1</td><td>Row 1</td></tr>`,
        `${ind}    <tr><td>Row 2</td><td>Row 2</td><td>Row 2</td></tr>`,
        `${ind}    <tr><td>Row 3</td><td>Row 3</td><td>Row 3</td></tr>`,
        `${ind}  </tbody>`,
        `${ind}</table>`,
      ].join('\n');
    }

    if (node.type === 'button') return `${ind}<button>Click me</button>`;
    if (node.type === 'logo')   return `${ind}<a href="#" class="logo">Logo</a>`;
    if (node.type === 'h1')     return `${ind}<h1${classAttr}>Page Heading</h1>`;
    if (node.type === 'h2')     return `${ind}<h2${classAttr}>Section Heading</h2>`;
    if (node.type === 'h3')     return `${ind}<h3${classAttr}>Sub-heading</h3>`;

    if (node.type === 'nav') {
      return `${ind}<nav>\n${ind}  <a href="#">Home</a>\n${ind}  <a href="#">About</a>\n${ind}  <a href="#">Work</a>\n${ind}  <a href="#">Contact</a>\n${ind}</nav>`;
    }

    if (node.type === 'p') {
      const nParas = { sm: 1, md: 2, lg: 4 }[node.text || 'sm'];
      const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
      const floatImg = (node.children || []).find(c => c.type === 'img' && c.float && c.float !== 'none');
      if (floatImg) {
        const imgHTML = nodeToHTML(floatImg, depth + 1); // picks up float/width/aspect-ratio via its own class
        const firstPara = `${ind}<p${classAttr}>\n${imgHTML}\n${ind}  ${lorem}\n${ind}</p>`;
        if (nParas === 1) return firstPara;
        return firstPara + '\n' + Array(nParas - 1).fill(`${ind}<p>${lorem}</p>`).join('\n');
      }
      if (nParas === 1) return `${ind}<p${classAttr}>${lorem}</p>`;
      return Array(nParas).fill(`${ind}<p>${lorem}</p>`).join('\n');
    }

    // --- Container nodes ---
    const children = (node.children || []).map(c => nodeToHTML(c, depth + 1)).join('\n');
    return `${ind}<${tag}${classAttr}>\n${children}\n${ind}</${tag}>`;
  }

  const bodyHTML = nodeToHTML(clean);

  // --- Assemble CSS ---
  const globalRules = [
    `* { box-sizing: border-box; margin: 0; padding: 0; }`,
    `body { font-family: system-ui, sans-serif; max-width: ${bodyWidthCSS}; margin: 0 auto; }`,
    used.has('img')     && `img { display: block; width: 100%; background: #ddd; }`,
    used.has('h1')      && `h1 { font-size: 2rem; margin-bottom: 0.5rem; }`,
    used.has('h2')      && `h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }`,
    used.has('h3')      && `h3 { font-size: 1.2rem; margin-bottom: 0.5rem; }`,
    used.has('p')       && `p { color: #555; line-height: 1.6; margin-bottom: 0.5rem; }`,
    used.has('button')  && `button { padding: 0.5rem 1.5rem; border: none; border-radius: 5px; background: #333; color: #fff; cursor: pointer; }`,
    used.has('nav')     && `nav { display: flex; gap: 1rem; }`,
    used.has('nav')     && `nav a { text-decoration: none; color: inherit; }`,
    used.has('article') && `article { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }`,
    used.has('input')   && `input[type="text"] { padding: 0.4rem 0.75rem; border: 1px solid #ccc; border-radius: 5px; font-size: 1rem; width: 100%; }`,
    used.has('input')   && `label { display: flex; align-items: center; gap: 0.5rem; }`,
    used.has('table')   && `table { width: 100%; border-collapse: collapse; }`,
    used.has('table')   && `th, td { padding: 0.5rem 1rem; border: 1px solid #ddd; text-align: left; }`,
    used.has('table')   && `th { background: #f5f5f5; font-weight: 600; }`,
    used.has('logo')    && `.logo { font-weight: bold; font-size: 1.2rem; text-decoration: none; color: inherit; }`,
  ].filter(Boolean);
  const globalCSS = globalRules.join('\n');

  const layoutCSS = generatedRules.length
    ? '\n/* Layout */\n' + generatedRules.map(([sel, decls]) =>
        `${sel} {\n${decls.map(d => `  ${d};`).join('\n')}\n}`
      ).join('\n')
    : '';

  const fullCSS = (globalCSS + layoutCSS)
    .split('\n').map(l => `    ${l}`).join('\n');

  const includeValidator = document.getElementById('export-validator')?.checked ?? true;
  const validatorScript = includeValidator ? `\n  <script>\n  (function() {\n    var s = document.createElement("script");\n    s.src = "https://cdn.jsdelivr.net/gh/gracehoppercenter/validate@1.0.5/validate.js";\n    s.async = false;\n    document.head.appendChild(s);\n  })();\n  <\/script>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <style>
${fullCSS}
  </style>
</head>
<body>
${bodyHTML}${validatorScript}
</body>
</html>`;

  document.getElementById('export-code').textContent = html;
  document.getElementById('export-copy-btn').textContent = 'Copy';
  document.getElementById('export-copy-btn').classList.remove('copied');
  document.getElementById('export-modal').classList.add('open');
}

function copyExport() {
  const code = document.getElementById('export-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('export-copy-btn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
}

function closeExportModal(e) {
  if (e && e.target !== document.getElementById('export-modal')) return;
  document.getElementById('export-modal').classList.remove('open');
}
