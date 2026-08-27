import { findItems, findCategories, autoAccept, fuzzyScore } from './fuzzy.js';
import { pickItems, pickOne, confirmAction } from './picker.js';
import { listSets } from './store.js';
import { refreshWallpaper } from './wallpaper.js';

export const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
export const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;
export const STRIKE = (s) => `\x1b[9m${s}\x1b[0m`;

export { confirmAction };

/** Bail with a match list when interactive prompting isn't possible. */
export function guardTTY(matches, what) {
  if (process.stdout.isTTY) return;
  console.error(`Ambiguous ${what}; matches:`);
  for (const m of matches.slice(0, 10)) {
    console.error(`  [${m.category?.name ?? m.name}] ${m.item?.text ?? ''} (score ${m.score?.toFixed(1)})`);
  }
  console.error('Refine your query.');
  process.exit(1);
}

/**
 * Fuzzy-resolve items. Auto-accepts unambiguous matches,
 * otherwise opens an interactive multi-select.
 */
export async function resolveItems(checklist, query, catQuery, { done } = {}) {
  let matches = findItems(checklist, query, catQuery);
  if (done !== undefined) matches = matches.filter((m) => m.item.done === done);
  if (matches.length === 0) return [];
  const auto = autoAccept(matches);
  if (auto) return auto;
  guardTTY(matches, 'match');
  return pickItems(matches, `Multiple matches for "${query}" — select:`);
}

/**
 * Fuzzy-resolve a single category. Without a query, opens a picker
 * (auto-selects when there's only one category).
 */
export async function resolveCategory(checklist, catQuery, message) {
  if (!catQuery) {
    if (checklist.categories.length === 0) return null;
    if (checklist.categories.length === 1) return checklist.categories[0];
    guardTTY(checklist.categories, 'category');
    return pickOne(checklist.categories, message);
  }
  const matches = findCategories(checklist, catQuery);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].category;
  const tied = matches.filter((m) => m.score >= matches[0].score - 15);
  if (tied.length === 1) return tied[0].category;
  guardTTY(matches.map((m) => ({ name: m.category.name, score: m.score })), 'category');
  return pickOne(matches.map((m) => m.category), `Multiple categories match "${catQuery}":`);
}

/**
 * Fuzzy-resolve a set name. Returns null when nothing matches.
 */
export async function resolveSet(query, pickerMessage) {
  const sets = listSets();
  const matches = sets
    .map((name) => ({ name, score: fuzzyScore(query, name) }))
    .filter((m) => m.score !== null)
    .sort((a, b) => b.score - a.score);
  if (matches.length === 0) return null;
  if (matches.length === 1 || matches[1].score < matches[0].score - 15) {
    return matches[0].name;
  }
  guardTTY(matches, 'set');
  return (await pickOne(matches, pickerMessage)).name;
}

/** Re-render + set wallpaper; prints the path unless silent. */
export async function refresh(silent = false) {
  const { png } = await refreshWallpaper();
  if (!silent) console.log(`Wallpaper updated → ${png}`);
  else console.log('Wallpaper updated.');
}
