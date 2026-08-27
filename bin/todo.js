#!/usr/bin/env node
import { Command } from 'commander';
import { loadChecklist, saveChecklist, loadConfig, saveConfig, newId, paths,
  listSets, getActiveSet, setActiveSet, createSet, renameSet, deleteSet } from '../src/store.js';
import { THEMES, buildCustomTheme, swatch } from '../src/themes.js';
import { exportExcalidraw } from '../src/excalidraw-export.js';
import { DIM, BOLD, STRIKE, resolveItems, resolveCategory, resolveSet,
  confirmAction, refresh } from '../src/cli-utils.js';

const program = new Command();
program
  .name('todo')
  .description('Checklist wallpaper CLI — Excalidraw-style dark wallpaper driven by your checklist')
  .version('0.1.0');

const die = (msg) => { console.error(msg); process.exit(1); };
const tryOrDie = async (fn) => { try { return await fn(); } catch (e) { die(e.message); } };

// ---------- list ----------
program
  .command('list')
  .description('Show the checklist')
  .action(() => {
    const cl = loadChecklist();
    console.log(DIM(`set: ${getActiveSet()}`));
    for (const cat of cl.categories) {
      console.log(BOLD(cat.name));
      cat.items.forEach((it, i) => {
        const line = `  ${i + 1}. ${it.text}`;
        console.log(it.done ? DIM(`  ${i + 1}. ${STRIKE(it.text)}`) : line);
      });
      console.log();
    }
  });

// ---------- add ----------
program
  .command('add')
  .description('Add an item (fuzzy category via --cat, picker otherwise)')
  .argument('<text...>', 'item text')
  .option('--cat <query>', 'fuzzy category match')
  .action(async (textParts, opts) => {
    const cl = loadChecklist();
    const cat = await resolveCategory(cl, opts.cat, 'Add to which category?');
    if (!cat) die(cl.categories.length === 0
      ? 'No categories yet — create one with: todo cat add "<name>"'
      : `No category matches "${opts.cat}"`);
    const text = textParts.join(' ');
    cat.items.push({ id: newId(), text, done: false });
    saveChecklist(cl);
    console.log(`Added to [${cat.name}]: ${text}`);
    await refresh();
  });

// ---------- cat ----------
const cat = program.command('cat').description('Manage categories');

cat.command('add')
  .argument('<name...>', 'category name')
  .action(async (nameParts) => {
    const cl = loadChecklist();
    const name = nameParts.join(' ');
    cl.categories.push({ id: newId(), name, items: [] });
    saveChecklist(cl);
    console.log(`Category added: ${name}`);
    await refresh();
  });

cat.command('rm')
  .argument('<query...>', 'fuzzy category match')
  .option('-y, --yes', 'skip confirmation')
  .action(async (queryParts, opts) => {
    const cl = loadChecklist();
    const target = await resolveCategory(cl, queryParts.join(' '), 'Remove which category?');
    if (!target) die('No matching category');
    const ok = opts.yes || (process.stdout.isTTY
      && await confirmAction(`Delete "${target.name}" and its ${target.items.length} items?`));
    if (!ok) { console.log('Aborted.'); return; }
    cl.categories = cl.categories.filter((c) => c.id !== target.id);
    saveChecklist(cl);
    console.log(`Removed: ${target.name}`);
    await refresh();
  });

// ---------- set ----------
const set = program.command('set').description('Manage named checklist sets (e.g. Personal / Work)');

set.command('list', { isDefault: true })
  .description('List sets (active marked)')
  .action(() => {
    const active = getActiveSet();
    for (const name of listSets()) {
      console.log(`  ${name}${name === active ? ' ← active' : ''}`);
    }
  });

set.command('new')
  .description('Create a new empty set')
  .argument('<name...>', 'set name')
  .action(async (nameParts) => {
    const name = nameParts.join(' ');
    await tryOrDie(() => createSet(name));
    console.log(`Set created: ${name}`);
  });

set.command('switch')
  .description('Switch the active set (fuzzy name match) and refresh the wallpaper')
  .argument('<name...>', 'fuzzy set name')
  .action(async (nameParts) => {
    const target = await resolveSet(nameParts.join(' '), 'Switch to which set?');
    if (!target) die(`No set matches "${nameParts.join(' ')}".`);
    setActiveSet(target);
    console.log(`Active set: ${target}`);
    await refresh();
  });

set.command('rename')
  .description('Rename a set')
  .argument('<query>', 'fuzzy current name')
  .argument('<newName...>', 'new name')
  .action(async (query, newNameParts) => {
    const from = await resolveSet(query, 'Rename which set?');
    if (!from) die(`No set matches "${query}".`);
    const to = newNameParts.join(' ');
    await tryOrDie(() => renameSet(from, to));
    console.log(`Renamed: ${from} → ${to}`);
  });

set.command('rm')
  .description('Delete a set')
  .argument('<query...>', 'fuzzy set name')
  .option('-y, --yes', 'skip confirmation')
  .action(async (queryParts, opts) => {
    const target = await resolveSet(queryParts.join(' '), 'Delete which set?');
    if (!target) die(`No set matches "${queryParts.join(' ')}".`);
    const ok = opts.yes || (process.stdout.isTTY
      && await confirmAction(`Delete set "${target}" permanently?`));
    if (!ok) { console.log('Aborted.'); return; }
    await tryOrDie(() => deleteSet(target));
    console.log(`Deleted set: ${target} (active: ${getActiveSet()})`);
    await refresh();
  });

// ---------- tick / untick ----------
async function tickAction(queryParts, opts, done) {
  const cl = loadChecklist();
  const query = queryParts.join(' ');
  const matches = await resolveItems(cl, query, opts.cat, { done: !done });
  if (matches.length === 0) {
    die(`No ${done ? 'open' : 'ticked'} item matches "${query}"${opts.cat ? ` in category "${opts.cat}"` : ''}`);
  }
  for (const m of matches) {
    m.item.done = done;
    console.log(`${done ? '✓ ticked' : '↩ unticked'}: [${m.category.name}] ${m.item.text}`);
  }
  saveChecklist(cl);
  await refresh(true);
}

program
  .command('tick')
  .description('Tick off item(s) — fuzzy query, optional --cat filter')
  .argument('<query...>', 'fuzzy item query')
  .option('--cat <query>', 'restrict to a category')
  .action((q, o) => tickAction(q, o, true));

program
  .command('untick')
  .description('Remove strikethrough from item(s)')
  .argument('<query...>', 'fuzzy item query')
  .option('--cat <query>', 'restrict to a category')
  .action((q, o) => tickAction(q, o, false));

// ---------- clean ----------
program
  .command('clean')
  .description('Remove all struck-through items (optionally within one category)')
  .option('--cat <query>', 'restrict to a category')
  .action(async (opts) => {
    const cl = loadChecklist();
    const cats = opts.cat
      ? [await resolveCategory(cl, opts.cat, 'Clean which category?')].filter(Boolean)
      : cl.categories;
    if (opts.cat && cats.length === 0) die('No matching category');
    let removed = 0;
    for (const c of cats) {
      const before = c.items.length;
      c.items = c.items.filter((i) => !i.done);
      removed += before - c.items.length;
    }
    saveChecklist(cl);
    console.log(`Cleaned ${removed} item(s).`);
    await refresh();
  });

// ---------- theme ----------
program
  .command('theme')
  .description('List themes, or apply one: `todo theme gruvbox` / `todo theme custom <bg> <fg> [--dim c] [--accent c]`')
  .argument('[args...]', 'theme name or: custom <bg> <fg>')
  .option('--dim <hex>', 'custom dim color')
  .option('--accent <hex>', 'custom accent color')
  .action(async (args, opts) => {
    const config = loadConfig();
    if (args.length === 0) {
      console.log(BOLD('Available themes:'));
      for (const [name, t] of Object.entries(THEMES)) {
        const mark = config.theme === name ? ' ← active' : '';
        console.log(`  ${swatch(t.background)}${swatch(t.fg)}${swatch(t.accent)}  ${name}${mark}`);
      }
      console.log('\nCustom: todo theme custom #282828 #d5c4a1 --dim #928374 --accent #b8bb26');
      return;
    }
    if (args[0] === 'custom') {
      if (args.length < 3) die('Usage: todo theme custom <bg> <fg> [--dim c] [--accent c]');
      config.customTheme = await tryOrDie(() => buildCustomTheme(args[1], args[2], opts.dim, opts.accent));
      config.theme = 'custom';
    } else {
      const name = args.join('-').toLowerCase();
      if (!THEMES[name]) die(`Unknown theme "${name}". Options: ${Object.keys(THEMES).join(', ')}, custom`);
      config.theme = name;
    }
    saveConfig(config);
    console.log(`Theme: ${config.theme}`);
    await refresh();
  });

// ---------- render ----------
program
  .command('render')
  .description('Force re-render and set the wallpaper')
  .action(() => refresh());

// ---------- export ----------
program
  .command('export')
  .description('Write an .excalidraw scene of the current wallpaper (opens in local Excalidraw)')
  .option('-o, --out <file>', 'output file', paths.exportExcalidraw)
  .action((opts) => {
    console.log(`Exported → ${exportExcalidraw(opts.out)}`);
  });

program.parseAsync(process.argv).catch((e) => die(e.message || String(e)));
