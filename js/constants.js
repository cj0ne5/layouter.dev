const PADDING = { '0': 0, '0.5rem': 8, '1rem': 16, '2rem': 32 };
const GAP     = { '0': 0, '0.5rem': 8, '1rem': 16, '2rem': 32 };
const ROUGH_OPTS = { roughness: 1.1, strokeWidth: 1.4, stroke: '#444' };
const FONT = "16px 'Caveat', 'Comic Sans MS', cursive";
const FONT_SMALL = "13px 'Caveat', 'Comic Sans MS', cursive";
const INLINE_TYPES = ['a', 'strong', 'u', 'em', 'span'];

const FILLS = {
  page: 'transparent',
  header: '#e8e4f0',
  footer: '#e8e4f0',
  main: '#f2f4f8',
  section: '#edf4f0',
  nav: '#dde8f5',
  div: '#f5f0e8',
  article: '#fff8f0',
  img: '#dce8dc',
  h1: '#f0f0f0', h2: '#f0f0f0', h3: '#f0f0f0',
  p: '#f5f5f5',
  a: '#e9f4ff',
  strong: '#f6f2da',
  u: '#eef7ee',
  em: '#f5ecff',
  span: '#f1f1f1',
  logo: '#e8e0f0',
  button: '#d8eaff',
  input: '#fdfdfd',
  table: '#f0f4ff',
  default: '#f2f2f2'
};

const LABELS = {
  header: 'header', footer: 'footer', main: 'main', section: 'section',
  nav: '≡ nav', div: 'div', article: 'article',
  img: '✕ img', logo: '⬛ logo',
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  a: 'link', strong: 'strong', u: 'underline', em: 'emphasis', span: 'span',
  button: '[ Button ]',
  input: 'input',
  table: 'table',
};

// Image height / width, matching the aspect-ratio values in the exported CSS
const IMG_ASPECT = { portrait: 4 / 3, square: 1, landscape: 3 / 4, banner: 3 / 8 };
const IMG_ASPECT_CSS = { portrait: '3 / 4', square: '1', landscape: '4 / 3', banner: '8 / 3' };
// Image widths as a fraction of the containing block (exported as width: N%)
const IMG_INLINE_WIDTH = { icon: 0.1, sm: 0.3, md: 0.45, lg: 0.65 };
const IMG_BLOCK_WIDTH  = { sm: 0.35, md: 0.65, lg: 1 };
const IMG_ICON_H = 40;      // block icons export as height: 2.5rem
const FLOAT_MARGIN = { side: 16, bottom: 8 }; // exported float margins (1rem / 0.5rem)
const TEXT_MARGIN_BOTTOM = 8; // h1–h3 and p export with margin-bottom: 0.5rem
const INLINE_GAP = 4; // the whitespace between inline-block elements in exported HTML

const P_TEXT_H = { sm: 56, md: 112, lg: 196 };

function getParagraphLoremWords(size) {
  const loremPool = [
    'Lorem', 'ipsum', 'dolor', 'sit', 'amet,', 'consectetur',
    'adipiscing', 'elit.', 'Sed', 'do', 'eiusmod', 'tempor',
    'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua.'
  ];
  const wordCountBySize = { sm: 28, md: 72, lg: 132 };
  const targetWords = wordCountBySize[size || 'sm'] || 12;
  const words = [];
  for (let i = 0; i < targetWords; i++) words.push(loremPool[i % loremPool.length]);
  return words;
}
