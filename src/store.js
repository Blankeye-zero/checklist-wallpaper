import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const DATA_DIR = DIST_DIR; // data lives in dist/ alongside rendered output
const SETS_DIR = path.join(DATA_DIR, 'sets');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SEED_FILE = path.join(__dirname, '..', 'data', 'seed.json');
const DEFAULT_SET = 'Default';

export const paths = {
  dataDir: DATA_DIR,
  setsDir: SETS_DIR,
  distDir: DIST_DIR,
  config: CONFIG_FILE,
  wallpaperSvg: path.join(DIST_DIR, 'wallpaper.svg'),
  exportExcalidraw: path.join(DIST_DIR, 'wallpaper.excalidraw'),
};

const DEFAULT_CONFIG = {
  theme: 'gruvbox',
  customTheme: null, // { background, fg, dim, accent }
  width: null, // null = auto-detect
  height: null,
  rightMargin: 60,
  topMargin: 60,
  columns: 3,
  activeSet: DEFAULT_SET,
};

function uid() {
  return crypto.randomUUID().slice(0, 8);
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(SETS_DIR, { recursive: true });
}

function setFile(name) {
  return path.join(SETS_DIR, `${name}.json`);
}

function assertValidSetName(name) {
  if (!/^[\w][\w -]*$/.test(name)) {
    throw new Error(`Invalid set name "${name}" — use letters, numbers, spaces, dashes.`);
  }
}

export function listSets() {
  ensureDir();
  return fs.readdirSync(SETS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5));
}

export function getActiveSet() {
  return loadConfig().activeSet || DEFAULT_SET;
}

export function setActiveSet(name) {
  assertValidSetName(name);
  const config = loadConfig();
  config.activeSet = name;
  saveConfig(config);
}

export function createSet(name) {
  ensureDir();
  assertValidSetName(name);
  if (listSets().some((s) => s.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Set "${name}" already exists.`);
  }
  fs.writeFileSync(setFile(name), JSON.stringify({ categories: [] }, null, 2));
}

export function renameSet(from, to) {
  assertValidSetName(to);
  if (!fs.existsSync(setFile(from))) throw new Error(`No set named "${from}".`);
  if (fs.existsSync(setFile(to))) throw new Error(`Set "${to}" already exists.`);
  fs.renameSync(setFile(from), setFile(to));
  if (getActiveSet() === from) setActiveSet(to);
}

export function deleteSet(name) {
  if (!fs.existsSync(setFile(name))) throw new Error(`No set named "${name}".`);
  fs.rmSync(setFile(name));
  if (getActiveSet() === name) {
    const remaining = listSets();
    if (remaining.length === 0) createSet(DEFAULT_SET);
    setActiveSet(remaining[0] || DEFAULT_SET);
  }
}

export function loadChecklist() {
  ensureDir();
  const file = setFile(getActiveSet());
  if (!fs.existsSync(file)) {
    const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    const checklist = {
      categories: seed.categories.map((c) => ({
        id: uid(),
        name: c.name,
        items: c.items.map((text) => ({ id: uid(), text, done: false })),
      })),
    };
    fs.writeFileSync(file, JSON.stringify(checklist, null, 2));
    return checklist;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function saveChecklist(checklist) {
  ensureDir();
  fs.writeFileSync(setFile(getActiveSet()), JSON.stringify(checklist, null, 2));
}

export function loadConfig() {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }
  return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
}

export function saveConfig(config) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export const newId = uid;
