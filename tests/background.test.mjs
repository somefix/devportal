import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(
  new URL('../entrypoints/background.ts', import.meta.url),
  'utf8',
)
  .replace(/^import[\s\S]*?;\n/gm, '')
  .replace('export default defineBackground', 'defineBackground');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

async function setup(language = 'ru') {
  const items = [];
  const listeners = {};
  const environments = ['Local', 'Dev', 'Stage', 'Prod'].map((name) => ({
    id: name,
    name,
    address: `${name.toLowerCase()}.example.com`,
  }));
  environments.push({ id: 'empty', name: 'Empty', address: '' });
  const browser = {
    action: { setPopup: async () => {}, onClicked: { addListener() {} } },
    contextMenus: {
      removeAll: async () => {
        items.length = 0;
      },
      create: (item) => items.push(item),
      onClicked: {
        addListener: (callback) => {
          listeners.click = callback;
        },
      },
    },
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
    },
    storage: {
      onChanged: {
        addListener: (callback) => {
          listeners.change = callback;
        },
      },
    },
    commands: { onCommand: { addListener() {} } },
  };
  vm.runInNewContext(code, {
    browser,
    defineBackground: (callback) => callback(),
    storage: { getItem: async () => language },
    loadSettings: async () => ({
      selectedProject: 'p',
      projects: [{ id: 'p', environments }],
    }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { items, listeners };
}

test('link menu groups configured environments and one Local copy action', async () => {
  const { items } = await setup();
  assert.equal(items[0].id, 'devportal');
  assert.match(items[0].title, /Devportal.*Открыть на стенде/);
  assert.deepEqual(
    items.slice(1, 5).map((item) => item.title),
    ['Local', 'Dev', 'Stage', 'Prod'],
  );
  assert.ok(items.slice(1).every((item) => item.parentId === 'devportal'));
  assert.equal(items[5].type, 'separator');
  assert.equal(items[6].id, 'copy:Local');
  assert.equal(items.length, 7);
});

test('English menu is rebuilt when language changes', async () => {
  const { items, listeners } = await setup('en');
  assert.equal(items[0].title, 'Devportal — Open in environment');
  assert.equal(items.at(-1).title, 'Copy Local URL');
  items.length = 0;
  listeners.change({ language: { newValue: 'en' } }, 'sync');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(items.length, 7);
});
