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
  header: 'header', footer: 'footer', section: 'section',
  nav: '≡ nav', div: 'div', article: 'article',
  img: '✕ img', logo: '⬛ logo',
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  a: 'link', strong: 'strong', u: 'underline', em: 'emphasis', span: 'span',
  button: '[ Button ]',
  input: 'input',
  table: 'table',
};

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
