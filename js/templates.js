const TEMPLATES = [
  {
    name: 'Blog',
    tree: {
      type: 'page', viewport: 1280, width: 900,
      children: [
        { type: 'header', layout: 'flex', align: 'space-between', padding: '1rem', children: [{ type: 'img', size: 'icon', aspect: 'square' }, { type: 'nav' }] },
        {
          type: 'section', layout: 'block', padding: '2rem',
          children: [{ type: 'h1' }, { type: 'p', text: 'md' }]
        },
        {
          type: 'section', layout: 'grid', colTemplate: '1fr 1fr 1fr', gap: '1rem', padding: '2rem',
          children: [
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] }
          ]
        },
        { type: 'footer', layout: 'flex', align: 'space-between', padding: '1rem', children: [{ type: 'p' }, { type: 'nav' }] }
      ]
    }
  },

  {
    name: 'Landing Page',
    tree: {
      type: 'page', viewport: 1280, width: 1100,
      children: [
        { type: 'header', layout: 'flex', align: 'space-between', padding: '1rem', children: [{ type: 'img', size: 'icon', aspect: 'square' }, { type: 'nav' }] },
        {
          type: 'section', layout: 'block', padding: '2rem',
          children: [{ type: 'h1' }, { type: 'p', text: 'md' }, { type: 'button' }]
        },
        {
          type: 'section', layout: 'grid', colTemplate: '1fr 1fr 1fr', gap: '1rem', padding: '2rem',
          children: [
            { type: 'div', layout: 'block', padding: '1rem', children: [{ type: 'h3' }, { type: 'p' }] },
            { type: 'div', layout: 'block', padding: '1rem', children: [{ type: 'h3' }, { type: 'p' }] },
            { type: 'div', layout: 'block', padding: '1rem', children: [{ type: 'h3' }, { type: 'p' }] }
          ]
        },
        {
          type: 'section', layout: 'block', padding: '2rem',
          children: [{ type: 'h2' }, { type: 'p' }, { type: 'button' }]
        },
        { type: 'footer', layout: 'flex', align: 'center', padding: '1rem', children: [{ type: 'p' }] }
      ]
    }
  },

  {
    name: 'Magazine',
    tree: {
      type: 'page', viewport: 1280, width: 1100,
      children: [
        { type: 'header', layout: 'flex', align: 'space-between', padding: '1rem', children: [{ type: 'img', size: 'icon', aspect: 'square' }, { type: 'nav' }] },
        {
          type: 'section', layout: 'grid', colTemplate: '1fr 250px', gap: '1rem', padding: '2rem',
          children: [
            {
              type: 'article', padding: '0.5rem',
              children: [{ type: 'img', size: 'lg', aspect: 'landscape' }, { type: 'h1' }, { type: 'p', text: 'md' }]
            },
            {
              type: 'div', layout: 'block', padding: '0.5rem',
              children: [
                { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] },
                { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }] }
              ]
            }
          ]
        },
        {
          type: 'section', layout: 'grid', colTemplate: '1fr 1fr 1fr 1fr', gap: '1rem', padding: '2rem',
          children: [
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'portrait' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'portrait' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'portrait' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'portrait' }, { type: 'h2' }, { type: 'p' }] }
          ]
        },
        { type: 'footer', layout: 'flex', align: 'space-between', padding: '1rem', children: [{ type: 'p' }, { type: 'nav' }] }
      ]
    }
  },

  {
    name: 'Mobile App',
    tree: {
      type: 'page', viewport: 375, width: '100%',
      children: [
        { type: 'header', layout: 'flex', align: 'space-between', padding: '0.5rem',
          children: [{ type: 'img', size: 'icon', aspect: 'square' }, { type: 'nav', menuStyle: 'hamburger' }] },
        {
          type: 'section', layout: 'block', padding: '2rem',
          children: [{ type: 'h1' }, { type: 'p', text: 'md' }, { type: 'button' }]
        },
        {
          type: 'section', layout: 'grid', colTemplate: '1fr 1fr', gap: '1rem', padding: '1rem',
          children: [
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'square' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'square' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'square' }, { type: 'h2' }, { type: 'p' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'md', aspect: 'square' }, { type: 'h2' }, { type: 'p' }] }
          ]
        },
        { type: 'footer', layout: 'flex', align: 'center', padding: '0.5rem', children: [{ type: 'p' }] }
      ]
    }
  },

  {
    name: 'Multi-step Form',
    tree: {
      type: 'page', viewport: 768, width: 600,
      children: [
        { type: 'header', layout: 'flex', align: 'space-between', padding: '1rem',
          children: [{ type: 'img', size: 'icon', aspect: 'square' }, { type: 'nav' }] },
        {
          type: 'section', layout: 'block', padding: '2rem',
          children: [
            { type: 'h1' },
            { type: 'div', layout: 'block', patternHint: 'progress', padding: '0', children: [] },
            { type: 'h2' },
            { type: 'input', showLabel: true },
            { type: 'input', showLabel: true },
            { type: 'input', showLabel: true },
            { type: 'div', layout: 'flex', align: 'space-between', gap: '1rem', padding: '0',
              children: [{ type: 'button' }, { type: 'button' }] }
          ]
        },
        { type: 'footer', layout: 'flex', align: 'center', padding: '1rem', children: [{ type: 'p' }] }
      ]
    }
  },

  {
    name: 'Directory',
    tree: {
      type: 'page', viewport: 1280, width: 1100,
      children: [
        { type: 'header', layout: 'flex', align: 'space-between', padding: '1rem',
          children: [{ type: 'img', size: 'icon', aspect: 'square' }, { type: 'nav' }] },
        {
          type: 'section', layout: 'block', padding: '2rem',
          children: [
            { type: 'h1' },
            { type: 'div', layout: 'flex', gap: '0.5rem', padding: '0',
              children: [{ type: 'input' }, { type: 'button' }] }
          ]
        },
        {
          type: 'section', layout: 'grid', colTemplate: '1fr 1fr 1fr', gap: '1rem', padding: '2rem',
          children: [
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }, { type: 'button' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }, { type: 'button' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }, { type: 'button' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }, { type: 'button' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }, { type: 'button' }] },
            { type: 'article', padding: '0.5rem', children: [{ type: 'img', size: 'sm', aspect: 'landscape' }, { type: 'h2' }, { type: 'p' }, { type: 'button' }] }
          ]
        },
        {
          type: 'section', layout: 'block', padding: '1rem',
          children: [{ type: 'nav', menuStyle: 'pagination' }]
        },
        { type: 'footer', layout: 'flex', align: 'space-between', padding: '1rem',
          children: [{ type: 'p' }, { type: 'nav' }] }
      ]
    }
  }
];

function populateTemplateSelect() {
  const sel = document.getElementById('template-select');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  TEMPLATES.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
}

function loadTemplate(select) {
  const idx = parseInt(select.value);
  if (isNaN(idx)) return;
  const tpl = TEMPLATES[idx];
  if (!confirm(`Replace the current layout with "${tpl.name}"?`)) {
    select.value = '';
    return;
  }
  pushHistoryState();
  const fresh = JSON.parse(JSON.stringify(tpl.tree));
  Object.assign(pageTree, fresh);
  selectedNode = null;
  select.value = '';
  updatePropsPanel();
  render();
}
