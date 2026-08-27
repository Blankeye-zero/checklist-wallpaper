import rough from 'roughjs';
import { computeLayout } from './layout.js';

const generator = rough.generator();

function opsToPath(ops) {
  let d = '';
  for (const op of ops) {
    if (op.op === 'move') d += `M${f(op.data[0])} ${f(op.data[1])}`;
    else if (op.op === 'lineTo') d += `L${f(op.data[0])} ${f(op.data[1])}`;
    else if (op.op === 'bcurveTo')
      d += `C${f(op.data[0])} ${f(op.data[1])} ${f(op.data[2])} ${f(op.data[3])} ${f(op.data[4])} ${f(op.data[5])}`;
  }
  return d;
}

const f = (n) => Math.round(n * 100) / 100;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function roughPaths(drawable, stroke) {
  const out = [];
  for (const set of drawable.sets) {
    if (set.type !== 'path') continue; // skip fills — outline only
    out.push(
      `<path d="${opsToPath(set.ops)}" fill="none" stroke="${stroke}" ` +
      `stroke-width="${drawable.options.strokeWidth ?? 2}" stroke-linecap="round"/>`
    );
  }
  return out.join('\n');
}

function rectPath(x, y, w, h, stroke, scale) {
  return roughPaths(
    generator.rectangle(x, y, w, h, {
      roughness: 1.2,
      bowing: 1.5,
      strokeWidth: 2 * scale,
      fill: 'none',
    }),
    stroke
  );
}

function strikePath(x1, y1, x2, y2, stroke, scale) {
  return roughPaths(
    generator.line(x1, y1, x2, y2, {
      roughness: 1.6,
      bowing: 2,
      strokeWidth: 2.4 * scale,
    }),
    stroke
  );
}

function textEl(x, y, text, fontSize, fill, anchor = 'start', opacity = 1) {
  return `<text x="${f(x)}" y="${f(y)}" font-family="Virgil" font-size="${f(fontSize)}" ` +
    `fill="${fill}" text-anchor="${anchor}" opacity="${opacity}">${esc(text)}</text>`;
}

export function renderSvg(layout, theme) {
  const { width, height, sections } = layout;
  const scale = height / 1080;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${theme.background}"/>`,
  ];

  for (const s of sections) {
    const { header, label, lines } = s;
    parts.push(rectPath(header.x, header.y, header.w, header.h, theme.fg, scale));
    parts.push(textEl(header.titleX, header.titleY, s.name, header.fontSize, theme.fg, 'middle'));
    if (label) parts.push(textEl(label.x, label.y, label.text, label.fontSize, theme.accent));
    for (const line of lines) {
      if (line.done) {
        parts.push(textEl(line.x, line.y, line.text, line.fontSize, theme.dim, 'start', 0.85));
        parts.push(strikePath(line.x, line.y - line.fontSize * 0.32, line.x + line.strikeW, line.y - line.fontSize * 0.32, theme.dim, scale));
      } else {
        parts.push(textEl(line.x, line.y, line.text, line.fontSize, theme.fg));
      }
    }
  }

  parts.push('</svg>');
  return parts.join('\n');
}

export { computeLayout };
