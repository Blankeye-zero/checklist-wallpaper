// Right-anchored 3-over-2 grid layout.
// Produces positioned primitives consumed by both the SVG renderer
// and the .excalidraw exporter.

// Virgil average glyph width ≈ 0.52em (hand-drawn, wide-ish)
const CHAR_W = 0.52;

export function measure(text, fontSize) {
  return text.length * fontSize * CHAR_W;
}

export function wrapText(text, fontSize, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (cur && measure(trial, fontSize) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * @returns {{width:number, height:number, sections:Array}}
 * section: { name, header:{x,y,w,h,titleX,titleY,fontSize},
 *            label:{x,y,text,fontSize},
 *            lines:[{x,y,text,done,strikeW,fontSize}] }
 */
export function computeLayout(checklist, config) {
  const W = config.width || 1920;
  const H = config.height || 1080;
  const cats = checklist.categories.filter((c) => c.items.length || c.name);
  if (cats.length === 0) return { width: W, height: H, sections: [] };

  const cols = Math.max(1, Math.min(config.columns || 3, cats.length));
  const rows = Math.ceil(cats.length / cols);

  const base = H / 1080;
  let fit = 1;

  // Shrink fonts until every section fits its row (min 55%).
  let sections;
  for (;;) {
    sections = build(cats, { W, H, cols, rows, base: base * fit, config });
    const rowH = (H - config.topMargin - config.topMargin) / rows;
    const overflow = sections.some((s) => s.height > rowH);
    if (!overflow || fit <= 0.55) break;
    const worst = Math.max(...sections.map((s) => s.height));
    fit *= Math.min(0.95, rowH / worst);
  }
  return { width: W, height: H, sections };
}

function build(cats, { W, H, cols, rows, base, config }) {
  const rightMargin = config.rightMargin ?? 60;
  const topMargin = config.topMargin ?? 60;
  const iconReserve = W * 0.30; // keep left ~30% clear for desktop icons
  const regionX = iconReserve;
  const regionW = W - rightMargin - regionX;
  const colGap = 40 * base;
  const colW = (regionW - colGap * (cols - 1)) / cols;
  const rowH = (H - topMargin * 2) / rows;

  const headerFont = 24 * base;
  const itemFont = 30 * base;
  const lineHeight = itemFont * 1.45;
  const headerGapY = 46 * base;
  const padX = 26 * base;

  return cats.map((cat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const colX = regionX + col * (colW + colGap);
    const rowY = topMargin + row * rowH;

    // header box, centered in column
    const titleW = measure(cat.name, headerFont);
    const hw = Math.min(titleW + padX * 2, colW);
    const hh = headerFont * 2.5;
    const hx = colX + (colW - hw) / 2;
    const hy = rowY;

    // requirements label
    const labelY = hy + hh + headerGapY;
    const textX = colX + 6 * base;
    const maxTextW = colW - 12 * base;

    // numbered items, wrapped with hanging indent
    const lines = [];
    let y = labelY + lineHeight * 1.15;
    cat.items.forEach((item, idx) => {
      const prefix = `${idx + 1}. `;
      const indent = measure(prefix, itemFont);
      const wrapped = wrapText(item.text, itemFont, maxTextW - indent);
      wrapped.forEach((chunk, li) => {
        const text = li === 0 ? prefix + chunk : chunk;
        const x = li === 0 ? textX : textX + indent;
        lines.push({
          x,
          y,
          text,
          done: item.done,
          strikeW: measure(text, itemFont),
          fontSize: itemFont,
        });
        y += lineHeight;
      });
    });

    return {
      name: cat.name,
      height: y - rowY,
      header: {
        x: hx, y: hy, w: hw, h: hh,
        titleX: hx + hw / 2,
        titleY: hy + hh / 2 + headerFont * 0.36,
        fontSize: headerFont,
      },
      label: cat.items.length
        ? { x: textX, y: labelY, text: 'Requirements:', fontSize: itemFont * 0.9 }
        : null,
      lines,
    };
  });
}
