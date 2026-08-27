// fzf-style subsequence scorer.
// Returns null when `query` is not a subsequence of `text`,
// otherwise a score (higher = better). Bonuses for consecutive
// runs, word/camel boundaries, and early matches.

export function fuzzyScore(query, text) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let qi = 0;
  let score = 0;
  let run = 0;
  let lastMatch = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;

    // boundary bonus: start of string or after space/dash/underscore
    const prev = ti === 0 ? ' ' : t[ti - 1];
    const boundary = /[\s\-_/.]/.test(prev) || (prev === prev.toLowerCase() && text[ti] === text[ti].toUpperCase());

    if (ti === lastMatch + 1) {
      run++;
      score += 10 + run * 5; // consecutive bonus
    } else {
      run = 0;
      score += 10;
    }
    if (boundary) score += 8;
    score -= ti * 0.05; // slight preference for earlier matches

    lastMatch = ti;
    qi++;
  }

  if (qi < q.length) return null; // not a subsequence
  // shorter targets rank higher for equal match quality
  return score - t.length * 0.1;
}

/**
 * Find items matching `query`, optionally restricted to a category fuzzy-match.
 * Returns [{ category, item, score }] sorted best-first.
 */
export function findItems(checklist, query, catQuery = null) {
  const results = [];
  for (const category of checklist.categories) {
    if (catQuery) {
      const cs = fuzzyScore(catQuery, category.name);
      if (cs === null) continue;
    }
    for (const item of category.items) {
      const score = fuzzyScore(query, item.text);
      if (score !== null) results.push({ category, item, score });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

export function findCategories(checklist, query) {
  const results = [];
  for (const category of checklist.categories) {
    const score = fuzzyScore(query, category.name);
    if (score !== null) results.push({ category, score });
  }
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Decide whether matches are unambiguous enough to act on directly.
 * Returns the auto-accepted matches, or null when the caller should prompt.
 */
export function autoAccept(matches) {
  if (matches.length === 0) return [];
  const best = matches[0].score;
  // exact-text equality is a slam dunk
  const tied = matches.filter((m) => Math.abs(m.score - best) < 1e-9);
  if (tied.length === 1 && matches.length > 1 && matches[1].score < best - 15) {
    return [matches[0]];
  }
  if (matches.length === 1) return [matches[0]];
  return null; // ambiguous → interactive picker
}
