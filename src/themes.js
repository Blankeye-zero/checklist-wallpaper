// Dark terminal/neovim palettes.
// background: wallpaper base · fg: text & hand-drawn strokes
// dim: struck-through items · accent: headers/requirements label

export const THEMES = {
  mono: {
    background: '#121212',
    fg: '#c9c9c9',
    dim: '#6b6b6b',
    accent: '#e8e8e8',
  },
  gruvbox: {
    background: '#282828',
    fg: '#d5c4a1',
    dim: '#928374',
    accent: '#b8bb26',
  },
  nord: {
    background: '#2e3440',
    fg: '#d8dee9',
    dim: '#616e88',
    accent: '#88c0d0',
  },
  'catppuccin-mocha': {
    background: '#1e1e2e',
    fg: '#cdd6f4',
    dim: '#7f849c',
    accent: '#89b4fa',
  },
  'tokyo-night': {
    background: '#1a1b26',
    fg: '#a9b1d6',
    dim: '#565f89',
    accent: '#7aa2f7',
  },
  dracula: {
    background: '#282a36',
    fg: '#f8f8f2',
    dim: '#6272a4',
    accent: '#bd93f9',
  },
  'one-dark': {
    background: '#282c34',
    fg: '#abb2bf',
    dim: '#5c6370',
    accent: '#61afef',
  },
  'rose-pine': {
    background: '#191724',
    fg: '#e0def4',
    dim: '#6e6a86',
    accent: '#c4a7e7',
  },
  'solarized-dark': {
    background: '#002b36',
    fg: '#93a1a1',
    dim: '#586e75',
    accent: '#268bd2',
  },
  kanagawa: {
    background: '#1f1f28',
    fg: '#dcd7ba',
    dim: '#727169',
    accent: '#7e9cd8',
  },
  everforest: {
    background: '#2d353b',
    fg: '#d3c6aa',
    dim: '#859289',
    accent: '#a7c080',
  },
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function resolveTheme(config) {
  if (config.theme === 'custom' && config.customTheme) return config.customTheme;
  return THEMES[config.theme] || THEMES.mono;
}

export function buildCustomTheme(bg, fg, dim, accent) {
  for (const [name, value] of Object.entries({ bg, fg, dim, accent })) {
    if (value && !HEX.test(value)) throw new Error(`Invalid hex color for ${name}: ${value}`);
  }
  return {
    background: bg,
    fg,
    dim: dim || fg,
    accent: accent || fg,
  };
}

/** ANSI truecolor swatch for `todo theme` listing. */
export function swatch(hex) {
  const n = parseInt(hex.slice(1).length === 3
    ? hex.slice(1).split('').map((c) => c + c).join('')
    : hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `\x1b[48;2;${r};${g};${b}m  \x1b[0m`;
}
