import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { setWallpaper } from 'wallpaper';
import { paths } from './store.js';
import { buildScene } from './scene.js';
import { renderSvg } from './render.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_FILE = path.join(__dirname, '..', 'assets', 'fonts', '0xProto-Regular.ttf');

export function detectResolution() {
  try {
    const out = execFileSync('powershell', [
      '-NoProfile', '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; ' +
      '$b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "$($b.Width)x$($b.Height)"',
    ], { encoding: 'utf8' }).trim();
    const m = out.match(/(\d+)x(\d+)/);
    if (m) return { width: +m[1], height: +m[2] };
  } catch { /* fall through */ }
  return { width: 1920, height: 1080 };
}

function rasterize(svg, background) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: {
      fontFiles: [FONT_FILE],
      defaultFontFamily: '0xProto',
      loadSystemFonts: false,
    },
    background,
  });
  return resvg.render().asPng();
}

async function applyWallpaper(pngFile) {
  for (let attempt = 0; ; attempt++) {
    try {
      await setWallpaper(pngFile, { screen: 'main' });
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

/** Remove stale timestamped renders (previous wallpapers). */
function cleanupOldRenders(keepFile) {
  for (const f of fs.readdirSync(paths.distDir)) {
    if (/^wallpaper-\d+\.png$/.test(f) && f !== path.basename(keepFile)) {
      try { fs.rmSync(path.join(paths.distDir, f)); } catch { /* still locked */ }
    }
  }
}

/**
 * Render the current checklist to SVG + PNG and set it as the wallpaper.
 * @returns {Promise<{png:string, svg:string}>}
 */
export async function refreshWallpaper({ set = true } = {}) {
  const { theme, layout } = buildScene();
  const svg = renderSvg(layout, theme);
  fs.writeFileSync(paths.wallpaperSvg, svg);

  // Windows locks the PNG while it is the active wallpaper, so write each
  // render to a fresh timestamped file instead of overwriting the old one.
  const pngFile = path.join(paths.distDir, `wallpaper-${Date.now()}.png`);
  fs.writeFileSync(pngFile, rasterize(svg, theme.background));

  if (set) {
    await applyWallpaper(pngFile);
    cleanupOldRenders(pngFile);
  }
  return { png: pngFile, svg: paths.wallpaperSvg };
}
