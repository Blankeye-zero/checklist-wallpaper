import { loadChecklist, loadConfig, saveConfig } from './store.js';
import { resolveTheme } from './themes.js';
import { computeLayout } from './layout.js';
import { detectResolution } from './wallpaper.js';

/**
 * Config with width/height guaranteed — auto-detects and persists
 * the primary screen resolution on first use.
 */
export function getResolvedConfig() {
  const config = loadConfig();
  if (!config.width || !config.height) {
    const res = detectResolution();
    config.width = config.width || res.width;
    config.height = config.height || res.height;
    saveConfig(config);
  }
  return config;
}

/** Everything needed to draw the wallpaper: data + theme + positioned layout. */
export function buildScene() {
  const checklist = loadChecklist();
  const config = getResolvedConfig();
  const theme = resolveTheme(config);
  // Hidden categories stay in the data but never reach the wallpaper.
  const visible = { ...checklist, categories: checklist.categories.filter((c) => !c.hidden) };
  const layout = computeLayout(visible, config);
  return { checklist, config, theme, layout };
}
