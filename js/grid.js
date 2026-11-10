// CSS Grid support: track parsing, grid-template-areas, the `grid` shorthand,
// 2-D layout (rows + columns + named areas) and serialization back to CSS.
//
// Node schema (all optional):
//   colTemplate: '200px 1fr'            → grid-template-columns
//   rowTemplate: '100px 1fr 200px'      → grid-template-rows
//   areas:       ['head head', 'menu main', 'foot foot'] → grid-template-areas
// Child schema:
//   gridArea:    'head'                 → grid-area

const GRID_MIN_ROW = 40; // empty auto/fr rows are drawn at least this tall so you can drop into them

// ---------- Tokenizing ----------

// Split on top-level whitespace, keeping (...) and [...] groups and quoted strings intact.
function gridTokenize(str) {
  const tokens = [];
  let i = 0;
  const s = str.trim();
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '/') { tokens.push({ kind: 'slash', text: '/' }); i++; continue; }
    if (ch === '"' || ch === "'") {
      const end = s.indexOf(ch, i + 1);
      if (end === -1) throw new Error(`Missing closing ${ch} quote.`);
      tokens.push({ kind: 'string', text: s.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (ch === '[') {
      const end = s.indexOf(']', i);
      if (end === -1) throw new Error('Missing closing ] in line names.');
      tokens.push({ kind: 'names', text: s.slice(i, end + 1) });
      i = end + 1;
      continue;
    }
    let j = i, depth = 0;
    while (j < s.length) {
      const c = s[j];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (depth === 0 && (/\s/.test(c) || c === '/' || c === '"' || c === "'" || c === '[')) break;
      j++;
    }
    if (depth !== 0) throw new Error('Unbalanced parentheses.');
    tokens.push({ kind: 'word', text: s.slice(i, j) });
    i = j;
  }
  return tokens;
}

const TRACK_KEYWORDS = ['auto', 'min-content', 'max-content'];
const LENGTH_RE = /^(\d*\.?\d+)(px|fr|rem|em|%|vh|vw|ch)$/i;

function validateTrack(t) {
  const lower = t.toLowerCase();
  if (TRACK_KEYWORDS.includes(lower) || lower === '0') return;
  if (LENGTH_RE.test(lower)) return;
  let m = lower.match(/^minmax\((.*),(.*)\)$/);
  if (m) { validateTrack(m[1].trim()); validateTrack(m[2].trim()); return; }
  m = lower.match(/^fit-content\((.*)\)$/);
  if (m) return;
  if (/^\d*\.?\d+$/.test(lower)) throw new Error(`"${t}" needs a unit, e.g. ${t}px or ${t}fr.`);
  if (/^\d*\.?\d+\s/.test(lower)) throw new Error(`"${t}" — no space allowed between a number and its unit.`);
  throw new Error(`"${t}" isn't a track size this tool understands (try px, fr, rem, %, auto).`);
}

// Expand a track list string into individual track strings (repeat() expanded, line names dropped).
function expandTracks(str) {
  if (!str || !str.trim()) return [];
  const out = [];
  for (const tok of gridTokenize(str)) {
    if (tok.kind === 'names') continue;
    if (tok.kind !== 'word') throw new Error(`Unexpected ${tok.kind === 'slash' ? '/' : 'quoted string'} in a track list.`);
    const m = tok.text.match(/^repeat\(\s*(\d+)\s*,(.*)\)$/i);
    if (m) {
      const n = parseInt(m[1]);
      if (n < 1 || n > 24) throw new Error('repeat() count must be between 1 and 24 here.');
      const inner = expandTracks(m[2]);
      for (let k = 0; k < n; k++) out.push(...inner);
      continue;
    }
    if (/^repeat\(/i.test(tok.text)) throw new Error('Only repeat(<number>, …) is supported here (not auto-fill/auto-fit).');
    validateTrack(tok.text);
    out.push(tok.text);
  }
  return out;
}

function safeExpandTracks(str) {
  try { return expandTracks(str); } catch (_) { return []; }
}

// ---------- Track sizing ----------

// Fixed size in px, or null for flexible/auto tracks.
function trackFixedPx(t, totalPx) {
  const lower = t.toLowerCase();
  if (lower === '0') return 0;
  const m = lower.match(LENGTH_RE);
  if (m) {
    const v = parseFloat(m[1]);
    switch (m[2]) {
      case 'px': return v;
      case 'rem': case 'em': return v * 16;
      case 'ch': return v * 8;
      case '%': return totalPx * v / 100;
      case 'vw': return (pageTree.viewport || 1280) * v / 100;
      case 'vh': return 800 * v / 100;
      default: return null; // fr
    }
  }
  const mm = lower.match(/^minmax\((.*),(.*)\)$/);
  if (mm) {
    const max = mm[2].trim();
    const fixedMax = trackFixedPx(max, totalPx);
    if (fixedMax !== null) return fixedMax;
    const fixedMin = trackFixedPx(mm[1].trim(), totalPx);
    return trackFr(max) ? null : fixedMin;
  }
  return null;
}

// Flex factor: fr tracks → their value; auto/content tracks → 1 (wireframe approximation).
function trackFr(t) {
  const lower = t.toLowerCase();
  const m = lower.match(/^(\d*\.?\d+)fr$/);
  if (m) return parseFloat(m[1]);
  const mm = lower.match(/^minmax\((.*),(.*)\)$/);
  if (mm) return trackFr(mm[2].trim());
  return 0;
}

function isAutoTrack(t) {
  return trackFixedPx(t, 0) === null && trackFr(t) === 0;
}

function resolveColumns(tracks, innerW, gap) {
  const n = tracks.length;
  const available = Math.max(innerW - gap * (n - 1), 0);
  const fixed = tracks.map(t => trackFixedPx(t, innerW));
  const fixedTotal = fixed.reduce((s, v) => s + (v ?? 0), 0);
  const free = Math.max(available - fixedTotal, 0);
  // fr tracks share free space; auto columns stretch like 1fr unless fr tracks exist,
  // in which case fr takes the free space and auto collapses to a modest content width.
  const frs = tracks.map(trackFr);
  const hasFr = frs.some(f => f > 0);
  const autoW = hasFr ? Math.min(120, free / n) : 0;
  const autoCount = tracks.filter((t, i) => fixed[i] === null && frs[i] === 0).length;
  const freeForFr = Math.max(free - autoW * autoCount, 0);
  const totalFr = hasFr ? frs.reduce((s, f) => s + f, 0) : autoCount;
  return tracks.map((t, i) => {
    if (fixed[i] !== null) return fixed[i];
    if (hasFr) return frs[i] > 0 ? (frs[i] / totalFr) * freeForFr : autoW;
    return totalFr ? free / totalFr : 0;
  });
}

// contentH[r] = tallest single-row item in that row (0 if empty).
// The container has no definite height, so fr rows act like content-sized rows
// that keep their fr ratio (this mirrors the CSS algorithm for indefinite heights).
function resolveRows(tracks, contentH, innerW) {
  let frUnit = 0;
  tracks.forEach((t, r) => {
    const fr = trackFr(t);
    if (fr > 0 && trackFixedPx(t, innerW) === null) frUnit = Math.max(frUnit, Math.max(contentH[r], GRID_MIN_ROW) / fr);
  });
  return tracks.map((t, r) => {
    const fixed = trackFixedPx(t, innerW);
    if (fixed !== null) return fixed;
    const fr = trackFr(t);
    if (fr > 0) return fr * frUnit;
    return Math.max(contentH[r], GRID_MIN_ROW);
  });
}

// ---------- Areas ----------

function areaRowCells(rowStr) {
  return rowStr.trim().split(/\s+/).filter(Boolean).map(c => /^\.+$/.test(c) ? '.' : c);
}

// Returns { cells: string[][], rects: {name: {r0,r1,c0,c1}}, names, error }
// r1/c1 are exclusive.
function parseAreas(areas) {
  const cells = areas.map(areaRowCells);
  const result = { cells, rects: {}, names: [], error: null };
  if (!cells.length) return result;
  const nCols = cells[0].length;
  for (let r = 0; r < cells.length; r++) {
    if (cells[r].length === 0) { result.error = `Area row ${r + 1} is empty.`; return result; }
    if (cells[r].length !== nCols) {
      result.error = `Every area row needs the same number of cells — row 1 has ${nCols}, row ${r + 1} has ${cells[r].length}.`;
      return result;
    }
  }
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < nCols; c++) {
      const name = cells[r][c];
      if (name === '.') continue;
      if (!/^-?[A-Za-z_][\w-]*$/.test(name)) {
        result.error = `"${name}" isn't a valid area name — use letters, digits, - or _, starting with a letter.`;
        return result;
      }
      const rect = result.rects[name];
      if (!rect) { result.rects[name] = { r0: r, r1: r + 1, c0: c, c1: c + 1 }; result.names.push(name); }
      else {
        rect.r0 = Math.min(rect.r0, r); rect.r1 = Math.max(rect.r1, r + 1);
        rect.c0 = Math.min(rect.c0, c); rect.c1 = Math.max(rect.c1, c + 1);
      }
    }
  }
  for (const name of result.names) {
    const { r0, r1, c0, c1 } = result.rects[name];
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (cells[r][c] !== name) {
          result.error = `Area "${name}" isn't a rectangle. Each name must fill a single rectangular block of cells.`;
          return result;
        }
      }
    }
  }
  return result;
}

// ---------- Config ----------

function defaultColTemplate(node) {
  return Array(node.columns || 2).fill('1fr').join(' ');
}

// Everything layout/render/export need, with invalid templates handled like a browser would:
// an invalid `grid` shorthand is dropped entirely.
function getGridConfig(node) {
  let colTracks = safeExpandTracks(node.colTemplate || (node.areas ? '' : defaultColTemplate(node)));
  let rowTracks = safeExpandTracks(node.rowTemplate || '');
  let area = node.areas && node.areas.length ? parseAreas(node.areas) : null;
  let invalid = null;
  if (area && area.error) {
    invalid = area.error;
    area = null; colTracks = []; rowTracks = [];
  }
  const areaCols = area ? area.cells[0].length : 0;
  const areaRows = area ? area.cells.length : 0;
  while (colTracks.length < Math.max(areaCols, 1)) colTracks.push('auto');
  while (rowTracks.length < areaRows) rowTracks.push('auto');
  return { colTracks, rowTracks, area, invalid };
}

function gridAreaNames(node) {
  const cfg = getGridConfig(node);
  return cfg.area ? cfg.area.names : [];
}

// ---------- Placement & layout ----------

function placeGridItems(children, cfg) {
  const nCols = cfg.colTracks.length;
  const occupied = []; // occupied[r][c]
  const occ = (r, c) => occupied[r] && occupied[r][c];
  const mark = (p) => {
    for (let r = p.r0; r < p.r1; r++) {
      if (!occupied[r]) occupied[r] = [];
      for (let c = p.c0; c < p.c1; c++) occupied[r][c] = true;
    }
  };
  const placements = children.map(() => null);
  children.forEach((child, i) => {
    const rect = cfg.area && child.gridArea && cfg.area.rects[child.gridArea];
    if (rect) { placements[i] = { ...rect }; mark(rect); }
  });
  // Sparse auto-placement, row by row
  let cr = 0, cc = 0;
  children.forEach((child, i) => {
    if (placements[i]) return;
    while (occ(cr, cc)) { cc++; if (cc >= nCols) { cc = 0; cr++; } }
    placements[i] = { r0: cr, r1: cr + 1, c0: cc, c1: cc + 1 };
    mark(placements[i]);
    cc++; if (cc >= nCols) { cc = 0; cr++; }
  });
  const usedRows = placements.reduce((m, p) => Math.max(m, p.r1), 0);
  return { placements, nRows: Math.max(usedRows, cfg.rowTracks.length, 1) };
}

function layoutGrid(node, innerX, innerY, innerW, gap) {
  const cfg = getGridConfig(node);
  const children = node.children || [];
  const colWidths = resolveColumns(cfg.colTracks, innerW, gap);
  const colOffsets = computeOffsets(colWidths, gap);
  const { placements, nRows } = placeGridItems(children, cfg);
  const spanW = p => colOffsets[p.c1 - 1] + colWidths[p.c1 - 1] - colOffsets[p.c0];

  // Pass 1: measure each item at its column-span width
  const contentH = Array(nRows).fill(0);
  children.forEach((child, i) => {
    layoutTree(child, 0, 0, spanW(placements[i]));
    const p = placements[i];
    if (p.r1 - p.r0 === 1) contentH[p.r0] = Math.max(contentH[p.r0], child._h);
  });

  const rowTracks = cfg.rowTracks.slice();
  while (rowTracks.length < nRows) rowTracks.push('auto');
  const rowHeights = resolveRows(rowTracks, contentH, innerW);

  // Multi-row items: grow the last flexible row they span if they don't fit
  children.forEach((child, i) => {
    const p = placements[i];
    if (p.r1 - p.r0 < 2) return;
    let have = gap * (p.r1 - p.r0 - 1);
    for (let r = p.r0; r < p.r1; r++) have += rowHeights[r];
    const deficit = child._h - have;
    if (deficit <= 0) return;
    for (let r = p.r1 - 1; r >= p.r0; r--) {
      if (trackFixedPx(rowTracks[r], innerW) === null) { rowHeights[r] += deficit; break; }
    }
  });
  const rowOffsets = computeOffsets(rowHeights, gap);

  // Pass 2: real positions, items stretch to fill their area
  children.forEach((child, i) => {
    const p = placements[i];
    layoutTree(child, innerX + colOffsets[p.c0], innerY + rowOffsets[p.r0], spanW(p));
    const h = rowOffsets[p.r1 - 1] + rowHeights[p.r1 - 1] - rowOffsets[p.r0];
    if (child.type !== 'img') child._h = h;
  });

  node._colWidths = colWidths;
  node._colOffsets = colOffsets;
  node._rowHeights = rowHeights;
  node._rowOffsets = rowOffsets;
  node._innerX = innerX;
  node._innerY = innerY;
  node._gridCells = cfg.area ? cfg.area.cells : null;
  node._gridAreas = {};
  if (cfg.area) {
    for (const name of cfg.area.names) {
      const r = cfg.area.rects[name];
      node._gridAreas[name] = {
        x: innerX + colOffsets[r.c0],
        y: innerY + rowOffsets[r.r0],
        w: colOffsets[r.c1 - 1] + colWidths[r.c1 - 1] - colOffsets[r.c0],
        h: rowOffsets[r.r1 - 1] + rowHeights[r.r1 - 1] - rowOffsets[r.r0],
      };
    }
  }
  node._gridInvalid = cfg.invalid;
  const lastRow = rowHeights.length - 1;
  return rowOffsets[lastRow] + rowHeights[lastRow];
}

// Name of the grid area under (mx, my), or null.
function gridAreaAt(node, mx, my) {
  if (!node._gridAreas) return null;
  for (const [name, a] of Object.entries(node._gridAreas)) {
    if (mx >= a.x && mx <= a.x + a.w && my >= a.y && my <= a.y + a.h) return name;
  }
  return null;
}

// ---------- Parsing typed CSS ----------

const GRID_PROPS = ['grid', 'grid-template', 'grid-template-areas', 'grid-template-rows', 'grid-template-columns', 'gap', 'grid-gap', 'display'];

// Accepts a full rule (`.grid { display: grid; grid: ... }`), bare declarations,
// or just the value of the `grid` shorthand. Returns
// { colTemplate, rowTemplate, areas, gap } (undefined = not set) or throws Error.
function parseGridCSS(text) {
  let src = text.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const open = src.indexOf('{');
  if (open !== -1) {
    const close = src.lastIndexOf('}');
    src = src.slice(open + 1, close > open ? close : undefined);
  }
  src = src.trim();
  if (!src) throw new Error('Type a grid declaration, e.g. grid-template-columns: 1fr 1fr;');

  const out = { colTemplate: undefined, rowTemplate: undefined, areas: undefined, gap: undefined };
  const hasDecl = /^\s*[a-z-]+\s*:/im.test(src);
  if (!hasDecl) {
    Object.assign(out, parseGridShorthand(src));
    return out;
  }

  const decls = src.split(';').map(d => d.trim()).filter(Boolean);
  for (const decl of decls) {
    const colon = decl.indexOf(':');
    if (colon === -1) throw new Error(`"${decl.slice(0, 30)}" is missing a colon — did you forget a ; on the line before?`);
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (!GRID_PROPS.includes(prop)) throw new Error(`"${prop}" isn't a grid property this box understands (try grid, grid-template-areas, grid-template-rows, grid-template-columns, gap).`);
    if (!value) throw new Error(`${prop} has no value.`);
    if (prop === 'display') {
      if (value !== 'grid') throw new Error('display must be grid here.');
    } else if (prop === 'grid' || prop === 'grid-template') {
      Object.assign(out, parseGridShorthand(value));
    } else if (prop === 'grid-template-areas') {
      const toks = gridTokenize(value);
      if (!toks.length || toks.some(t => t.kind !== 'string')) throw new Error('grid-template-areas takes one quoted string per row, e.g. \'head head\' \'menu main\'.');
      out.areas = toks.map(t => t.text);
    } else if (prop === 'grid-template-rows') {
      expandTracks(value); out.rowTemplate = value;
    } else if (prop === 'grid-template-columns') {
      expandTracks(value); out.colTemplate = value;
    } else if (prop === 'gap' || prop === 'grid-gap') {
      if (!(value in GAP)) throw new Error(`gap: this tool supports ${Object.keys(GAP).join(', ')}.`);
      out.gap = value;
    }
  }
  if (out.areas) {
    const a = parseAreas(out.areas);
    if (a.error) throw new Error(a.error + ' Browsers ignore the whole declaration when this happens.');
  }
  return out;
}

function parseGridShorthand(value) {
  const toks = gridTokenize(value);
  if (toks.some(t => t.kind === 'word' && /^(auto-flow|dense)$/i.test(t.text))) {
    throw new Error('auto-flow isn\'t supported here — describe rows / columns instead.');
  }
  const slashes = toks.filter(t => t.kind === 'slash').length;
  if (slashes > 1) throw new Error('Only one / allowed: rows (or area strings) go before it, columns after.');
  const slashIdx = toks.findIndex(t => t.kind === 'slash');
  const left = slashIdx === -1 ? toks : toks.slice(0, slashIdx);
  const right = slashIdx === -1 ? [] : toks.slice(slashIdx + 1);
  const joinTracks = ts => ts.map(t => t.text).join(' ');

  if (right.some(t => t.kind === 'string')) throw new Error('Area strings must come before the /, columns after it.');
  const colStr = joinTracks(right.filter(t => t.kind !== 'names'));
  if (slashIdx !== -1 && !colStr) throw new Error('Add column sizes after the /, e.g. / 200px 1fr');

  const res = { colTemplate: colStr || undefined, rowTemplate: undefined, areas: undefined };

  if (left.some(t => t.kind === 'string')) {
    // [ 'area string' <row-size>? ]+
    const areas = [], rows = [];
    let pendingSize = false;
    for (const t of left) {
      if (t.kind === 'names') continue;
      if (t.kind === 'string') { areas.push(t.text); rows.push('auto'); pendingSize = true; continue; }
      if (!areas.length) throw new Error(`Row size "${t.text}" must come after its area string, e.g. 'head head' 100px`);
      if (!pendingSize) throw new Error(`Only one row size per area string — "${t.text}" is extra.`);
      if (/^repeat\(/i.test(t.text)) throw new Error('repeat() isn\'t allowed next to area strings.');
      validateTrack(t.text);
      rows[rows.length - 1] = t.text;
      pendingSize = false;
    }
    if (colStr && /repeat\(/i.test(colStr)) throw new Error('When you use area strings, columns can\'t use repeat() — write each size out.');
    if (colStr) expandTracks(colStr);
    const a = parseAreas(areas);
    if (a.error) throw new Error(a.error + ' Browsers ignore the whole declaration when this happens.');
    res.areas = areas.map(s => areaRowCells(s).join(' '));
    res.rowTemplate = rows.every(r => r === 'auto') ? undefined : rows.join(' ');
  } else {
    if (slashIdx === -1) throw new Error('Missing / — the grid shorthand is rows / columns, e.g. 100px 1fr / 200px 1fr');
    const rowStr = joinTracks(left.filter(t => t.kind !== 'names'));
    if (!rowStr) throw new Error('Add row sizes before the /.');
    expandTracks(rowStr);
    if (colStr) expandTracks(colStr);
    res.rowTemplate = rowStr;
  }
  return res;
}

// ---------- Serializing ----------

// Formats area rows with columns aligned, e.g. ["'head head'", "'menu main'"].
function formatAreaStrings(areas) {
  const cells = areas.map(areaRowCells);
  const nCols = Math.max(...cells.map(r => r.length));
  const widths = [];
  for (let c = 0; c < nCols; c++) widths[c] = Math.max(...cells.map(r => (r[c] || '').length));
  return cells.map(row => "'" + row.map((name, c) => c === row.length - 1 ? name : name.padEnd(widths[c])).join(' ') + "'");
}

// Declarations (without trailing ;) for a grid container, excluding display & gap.
// `cont` is the indentation for continuation lines.
function gridTemplateDecls(node, cont = '  ') {
  if (node.areas && node.areas.length) {
    const strings = formatAreaStrings(node.areas);
    const rows = safeExpandTracks(node.rowTemplate || '');
    const lines = strings.map((s, i) => `${cont}${s}${rows[i] ? ' ' + rows[i] : ''}`);
    const cols = node.colTemplate ? safeExpandTracks(node.colTemplate).join(' ') : '';
    if (cols) lines.push(`${cont}/ ${cols}`);
    return [`grid:\n${lines.join('\n')}`];
  }
  const decls = [`grid-template-columns: ${node.colTemplate || defaultColTemplate(node)}`];
  if (node.rowTemplate) decls.push(`grid-template-rows: ${node.rowTemplate}`);
  return decls;
}

// ---------- Canvas helpers ----------

const AREA_COLORS = ['#e3d7f5', '#d5ecf7', '#d9f0dc', '#fbe7cf', '#f7d9e3', '#e9edc9', '#d6e4f0', '#f2e1c8'];

function areaColor(name, names) {
  const i = names.indexOf(name);
  return AREA_COLORS[(i < 0 ? 0 : i) % AREA_COLORS.length];
}
