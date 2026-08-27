import fs from 'node:fs';
import crypto from 'node:crypto';
import { buildScene } from './scene.js';
import { measure } from './layout.js';

const rid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20);
const seed = () => crypto.randomInt(1, 2 ** 31);

function baseEl(type, x, y, w, h, strokeColor) {
  return {
    id: rid(),
    type,
    x, y,
    width: w, height: h,
    angle: 0,
    strokeColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: seed(),
    version: 1,
    versionNonce: seed(),
    isDeleted: false,
    boundElements: null,
    link: null,
    locked: false,
  };
}

function textEl(x, y, text, fontSize, color) {
  const el = baseEl('text', x, y, measure(text, fontSize), fontSize * 1.25, color);
  return {
    ...el,
    text,
    fontSize,
    fontFamily: 3, // monospace (closest built-in to 0xProto)
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: text,
    autoResize: true,
    lineHeight: 1.25,
  };
}

/** Build an .excalidraw scene from the current layout and write it to disk. */
export function exportExcalidraw(outFile) {
  const { theme, layout } = buildScene();

  const elements = [];
  for (const s of layout.sections) {
    const h = s.header;
    const rect = baseEl('rectangle', h.x, h.y, h.w, h.h, theme.fg);
    rect.roundness = { type: 3 };
    elements.push(rect);
    elements.push(textEl(h.titleX - measure(s.name, h.fontSize) / 2, h.y + h.h / 2 - h.fontSize * 0.625, s.name, h.fontSize, theme.fg));
    if (s.label) elements.push(textEl(s.label.x, s.label.y - s.label.fontSize, s.label.text, s.label.fontSize, theme.accent));
    for (const line of s.lines) {
      const color = line.done ? theme.dim : theme.fg;
      elements.push(textEl(line.x, line.y - line.fontSize, line.text, line.fontSize, color));
      if (line.done) {
        const y = line.y - line.fontSize * 0.32;
        const strike = baseEl('line', line.x, y, line.strikeW, 0, theme.dim);
        strike.points = [[0, 0], [line.strikeW, 0]];
        strike.lastCommittedPoint = null;
        strike.startBinding = null;
        strike.endBinding = null;
        strike.startArrowhead = null;
        strike.endArrowhead = null;
        elements.push(strike);
      }
    }
  }

  const scene = {
    type: 'excalidraw',
    version: 2,
    source: 'checklist-wallpaper-cli',
    elements,
    appState: {
      gridSize: 20,
      viewBackgroundColor: theme.background,
    },
    files: {},
  };
  fs.writeFileSync(outFile, JSON.stringify(scene, null, 2));
  return outFile;
}
