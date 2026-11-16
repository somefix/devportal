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

const setup = async (language = 'ru', stored = new Map()) => {
  const items = [];
  const listeners = {};
  const opened = [];
  let iconPopup;
  let badgeText;
  let title;
  stored.set('sync:language', language);
  const environments = ['Local', 'Dev', 'Stage', 'Prod'].map((name) => ({
    id: name,
    name,
    address: `${name.toLowerCase()}.example.com`,
  }));
  environments.push({ id: 'empty', name: 'Empty', address: '' });
  const settings = {
    selectedProject: 'p',
    projects: [{ id: 'p', environments, defaultEnvironment: 'Stage' }],
  };
  const browser = {
    action: {
      setBadgeBackgroundColor: async () => {},
      setBadgeText: async ({ text }) => {
        badgeText = text;
      },
      setTitle: async (details) => {
        title = details.title;
      },
      setPopup: async ({ popup }) => {
        iconPopup = popup;
      },
      onClicked: {
        addListener: (callback) => {
          listeners.action = callback;
        },
      },
    },
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
      getManifest: () => ({ version: '1.1.0' }),
      onInstalled: {
        addListener(callback) {
          listeners.install = callback;
        },
      },
      onStartup: {
        addListener(callback) {
          listeners.startup = callback;
        },
      },
      onMessage: {
        addListener: (callback) => {
          listeners.message = callback;
        },
      },
    },
    storage: {
      onChanged: {
        addListener: (callback) => {
          listeners.change = callback;
        },
      },
    },
    commands: {
      onCommand: {
        addListener: (callback) => {
          listeners.command = callback;
        },
      },
    },
  };
  vm.runInNewContext(code, {
    browser,
    defineBackground: (callback) => callback(),
    UPDATE_NOTICE_KEY: 'local:pendingUpdateVersion',
    storage: {
      getItem: async (key) => stored.get(key),
      setItem: async (key, value) => {
        stored.set(key, value);
      },
    },
    detectProject: () => undefined,
    loadSettings: async () => structuredClone(settings),
    toggleIconAction: async () => {
      settings.iconAction = settings.iconAction === 'local' ? 'popup' : 'local';
      listeners.change({ environmentSettings: { newValue: settings } }, 'sync');
    },
    openEnvironment: async (...args) => {
      opened.push(args);
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  return {
    items,
    listeners,
    opened,
    getSettings: () => settings,
    getPopup: () => iconPopup,
    getBadge: () => badgeText,
    getTitle: () => title,
  };
};

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

test('update badge survives restart and clears when options acknowledge it', async () => {
  const stored = new Map();
  const first = await setup('ru', stored);
  assert.equal(first.getBadge(), '');
  await first.listeners.install({ reason: 'update', previousVersion: '1.0.0' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(first.getBadge(), 'NEW');
  assert.match(first.getTitle(), /откройте параметры/);
  const restarted = await setup('en', stored);
  assert.equal(restarted.getBadge(), 'NEW');
  assert.match(restarted.getTitle(), /open extension options/);
  stored.delete('local:pendingUpdateVersion');
  restarted.listeners.change(
    { pendingUpdateVersion: { oldValue: '1.1.0' } },
    'local',
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(restarted.getBadge(), '');
  assert.equal(restarted.getTitle(), 'Devportal');
});

test('fresh install, browser updates and same-version reloads do not show NEW', async () => {
  const { listeners, getBadge } = await setup();
  for (const details of [
    { reason: 'install' },
    { reason: 'chrome_update' },
    { reason: 'update', previousVersion: '1.1.0' },
  ]) {
    await listeners.install(details);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(getBadge(), '');
  }
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

test('rapid autosaves rebuild a single set of context menu items', async () => {
  const { items, listeners } = await setup();
  const changes = { environmentSettings: { newValue: {} } };
  listeners.change(changes, 'sync');
  listeners.change(changes, 'sync');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(items.length, 7);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
});

test('popup navigation is handled by the background with the requested tab mode', async () => {
  const { listeners, opened } = await setup();
  const request = {
    type: 'devportal:open-environment',
    projectId: 'p',
    environmentId: 'Local',
    source: 'https://example.com/tasks',
    tabId: 42,
    newTab: false,
  };
  const response = await new Promise((resolve) => {
    assert.equal(listeners.message(request, {}, resolve), true);
  });
  assert.equal(response.ok, true);
  assert.equal(opened.length, 1);
  const [source, project, environment, tabId, newTab] = opened[0];
  assert.equal(source, request.source);
  assert.equal(project.id, 'p');
  assert.equal(environment.id, 'Local');
  assert.equal(tabId, 42);
  assert.equal(newTab, false);
});

test('the shortcut updates the popup after the icon mode changes', async () => {
  const { listeners, getSettings, getPopup } = await setup();
  await listeners.command('toggle-icon-action');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(getSettings().iconAction, 'local');
  assert.equal(getPopup(), '');

  await listeners.command('toggle-icon-action');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(getSettings().iconAction, 'popup');
  assert.equal(getPopup(), '/popup.html');
});

test('the extension icon opens the default environment in direct mode', async () => {
  const { listeners, opened } = await setup();
  await listeners.command('toggle-icon-action');
  const tab = { id: 42, url: 'https://example.com/tasks' };
  await listeners.action(tab);
  assert.equal(opened.length, 1);
  const [source, , environment, tabId] = opened[0];
  assert.equal(source, tab.url);
  assert.equal(environment.id, 'Stage');
  assert.equal(tabId, tab.id);
});
