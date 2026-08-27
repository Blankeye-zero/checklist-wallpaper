import { checkbox, select, confirm } from '@inquirer/prompts';

function itemLabel(m) {
  return `[${m.category.name}] ${m.item.text}${m.item.done ? '  ✓(done)' : ''}`;
}

/**
 * Interactive multi-select over fuzzy matches. Returns chosen matches.
 */
export async function pickItems(matches, message = 'Select items') {
  const choices = matches.slice(0, 15).map((m) => ({
    name: itemLabel(m),
    value: m,
  }));
  return checkbox({ message, choices, pageSize: 15 });
}

/**
 * Interactive single-select over anything with a `.name`.
 */
export async function pickOne(named, message = 'Pick one') {
  return select({
    message,
    choices: named.map((c) => ({ name: c.name, value: c })),
  });
}

export async function confirmAction(message) {
  return confirm({ message, default: false });
}
