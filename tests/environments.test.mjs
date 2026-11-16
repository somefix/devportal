import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Load the pure URL functions without the extension-only storage adapter.
const source = readFileSync(
  new URL('../shared/environments.ts', import.meta.url),
  'utf8',
).replace(
  "import { storage } from 'wxt/utils/storage';",
  'const storage = globalThis.__testStorage;',
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const values = new Map();
const writes = [];
let failWrites = false;
globalThis.__testStorage = {
  getItem: async (key) => structuredClone(values.get(key)),
  setItem: async (key, value) => {
    if (failWrites) throw new Error('QUOTA_BYTES_PER_ITEM');
    writes.push(key);
    values.set(key, structuredClone(value));
  },
};
let settingsLock = Promise.resolve();
Object.defineProperty(navigator, 'locks', {
  value: {
    request: (name, callback) => {
      assert.equal(name, 'sync:environmentSettings');
      const result = settingsLock.then(callback);
      settingsLock = result.catch(() => {});
      return result;
    },
  },
});
const {
  createProject,
  createSettingsSnapshot,
  transformUrl,
  validateSettings,
  detectProject,
  loadSettings,
  saveSettings,
  toggleIconAction,
  SETTINGS_KEY,
  HISTORY_KEY,
  clearSwitchHistory,
  openEnvironment,
  openHistorySource,
  addressUrl,
} = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
);
const project = createProject('Test');
project.environments[0].address = 'localhost:5173';
project.environments.push({
  id: 'prod',
  name: 'Prod',
  address: 'https://example.com',
  color: '#ed4552',
});
project.defaultEnvironment = project.environments[0].id;
validateSettings({
  version: 1,
  projects: [Object.assign(project, { stripPrefix: '/app' })],
  selectedProject: project.id,
});
const local = project.environments[0];
test('adding a second rule saves directly and preserves a concurrent shortcut change', async () => {
  const project = createProject('Rules');
  project.rules = [{ from: '/old', to: '/new' }];
  const settings = {
    version: 1,
    projects: [project],
    selectedProject: project.id,
    iconAction: 'popup',
  };
  await saveSettings(settings);
  project.rules.push({ from: '/draft', to: '/published' });

  try {
    await Promise.all([toggleIconAction(), saveSettings(settings, false)]);
    const saved = await loadSettings();
    assert.deepEqual(saved.projects[0].rules, project.rules);
    assert.equal(saved.iconAction, 'local');
  } finally {
    values.delete(SETTINGS_KEY);
    writes.length = 0;
  }
});
test('concurrent transitions keep every distinct source and a repeat moves to the top', async () => {
  const opened = [];
  globalThis.browser = {
    tabs: {
      create: async ({ url }) => {
        opened.push(url);
      },
    },
  };
  const first = 'https://example.com/first';
  const second = 'https://example.com/second';
  try {
    await Promise.all([
      openEnvironment(first, project, local),
      openEnvironment(second, project, local),
    ]);
    assert.deepEqual(values.get(HISTORY_KEY), [second, first]);
    values.set(HISTORY_KEY, [second, first, second]);
    await openHistorySource(first);
    assert.deepEqual(values.get(HISTORY_KEY), [first, second]);
    assert.deepEqual(opened, [
      'http://localhost:5173/first',
      'http://localhost:5173/second',
      first,
    ]);
    await assert.rejects(openHistorySource('javascript:alert(1)'));
    assert.equal(opened.length, 3);
    globalThis.browser.tabs.create = async () => {
      throw new Error('Tab unavailable');
    };
    await assert.rejects(openHistorySource(second), /Tab unavailable/);
    assert.deepEqual(values.get(HISTORY_KEY), [first, second]);
    await clearSwitchHistory();
    assert.deepEqual(values.get(HISTORY_KEY), []);
  } finally {
    delete globalThis.browser;
    values.delete(HISTORY_KEY);
    writes.length = 0;
  }
});
test('local HTTP, prefix, query and hash', () =>
  assert.equal(
    transformUrl(
      'https://example.com/app/tasks/123?tab=history#item',
      project,
      local,
    ),
    'http://localhost:5173/tasks/123?tab=history#item',
  ));
test('prefix matches full path segment only', () =>
  assert.equal(
    transformUrl('https://example.com/application', project, local),
    'http://localhost:5173/application',
  ));
test('a replacement rule can remove app/market/ from the path', () => {
  const project = createProject('Market');
  project.rules.push({ from: 'app/market/', to: '/' });
  assert.equal(
    transformUrl(
      'https://example.com/app/market/tasks?tab=history#item',
      project,
      local,
    ),
    'http://localhost:5173/tasks?tab=history#item',
  );
});
test('suffix can be removed', () =>
  assert.equal(
    transformUrl(
      'https://example.com/app?a=1#b',
      { ...project, preserveSuffix: false },
      local,
    ),
    'http://localhost:5173/',
  ));
test('explicit HTTPS and target base path survive', () =>
  assert.equal(
    transformUrl('https://example.com/app/tasks', project, {
      ...local,
      address: 'https://localhost:5173/base',
    }),
    'https://localhost:5173/base/tasks',
  ));
test('reopening the current environment preserves the full URL', () => {
  const environment = { ...local, address: 'http://localhost:5173/app' };
  const settings = {
    ...project,
    preserveSuffix: false,
    rules: [{ from: 'tasks', to: 'issues' }],
  };
  const source = 'http://localhost:5173/app/tasks?tab=history#item';
  assert.equal(transformUrl(source, settings, environment, true), source);
  assert.equal(
    transformUrl(
      'http://localhost:5173/application/tasks?tab=history#item',
      settings,
      environment,
      true,
    ),
    'http://localhost:5173/app/application/issues',
  );
});
test('legacy replacement rules work', () =>
  assert.equal(
    transformUrl(
      'https://example.com/app/tasks',
      {
        ...project,
        rules: [...project.rules, { from: 'tasks', to: 'issues' }],
      },
      local,
    ),
    'http://localhost:5173/issues',
  ));
test('saved prefixes migrate to the first editable rule only once', () => {
  const project = createProject('Migrated');
  project.rules.push({ from: 'tasks', to: 'issues' });
  const settings = {
    version: 1,
    projects: [{ ...project, stripPrefix: '/app/' }],
    selectedProject: project.id,
  };
  const migrated = validateSettings(settings);
  assert.equal('stripPrefix' in migrated.projects[0], false);
  assert.deepEqual(validateSettings(migrated).projects[0].rules, [
    { from: '/app', to: '/', match: 'path-prefix' },
    { from: 'tasks', to: 'issues' },
  ]);
  assert.equal(
    transformUrl('https://example.com/app/tasks', migrated.projects[0], local),
    'http://localhost:5173/issues',
  );
});
test('reject browser internal pages and credentials', () => {
  assert.throws(() => transformUrl('chrome://settings', project, local));
  assert.throws(() => addressUrl('https://user:pass@example.com'));
});
test('detect project by exact host and port', () => {
  const settings = { projects: [project] };
  assert.equal(
    detectProject(settings, 'https://example.com/app')?.id,
    project.id,
  );
  assert.equal(
    detectProject(settings, 'https://example.com.evil.test'),
    undefined,
  );
  assert.equal(detectProject(settings, 'http://localhost:5174'), undefined);
});
test('validate import and reject duplicate IDs', () => {
  const settings = {
    version: 1,
    projects: [project],
    selectedProject: project.id,
  };
  assert.equal(validateSettings(settings), settings);
  assert.throws(() =>
    validateSettings({ ...settings, projects: [project, project] }),
  );
  assert.throws(() => validateSettings({ version: 2, projects: [] }));
});
test('fresh installs start with a single Local environment on port 3000', async () => {
  const settings = await loadSettings();
  assert.equal(settings.projects.length, 1);
  const [project] = settings.projects;
  assert.equal(settings.selectedProject, project.id);
  assert.equal(project.environments.length, 1);
  const [local] = project.environments;
  assert.equal(local.name, 'Local');
  assert.equal(local.address, 'localhost:3000');
  assert.equal(project.defaultEnvironment, local.id);
  assert.equal(writes.length, 0);
});
test('manually created projects start with a single default Local environment', () => {
  const project = createProject('Another project');
  assert.equal(project.environments.length, 1);
  const [local] = project.environments;
  assert.equal(local.name, 'Local');
  assert.equal(local.address, 'localhost:3000');
  assert.equal(project.defaultEnvironment, local.id);
});
test('autosave skips incomplete drafts and retains the last complete edits', () => {
  const project = createProject('Example');
  const settings = {
    version: 1,
    projects: [project],
    selectedProject: project.id,
  };
  const snapshot = createSettingsSnapshot();
  snapshot(settings, true);

  const draft = { id: 'draft', name: '', address: '', color: '#1769ff' };
  const rule = { from: '/old', to: '' };
  project.environments.push(draft);
  project.rules.push(rule);
  draft.address = 'https://example.com';
  assert.equal(snapshot(settings).projects[0].environments.length, 1);
  assert.deepEqual(snapshot(settings).projects[0].rules, []);

  draft.name = 'Dev';
  rule.to = '/new';
  const saved = validateSettings(snapshot(settings)).projects[0];
  assert.deepEqual(saved.environments[1], draft);
  assert.deepEqual(saved.rules, [rule]);

  draft.address = 'https://';
  rule.from = ' ';
  assert.deepEqual(snapshot(settings).projects[0], saved);

  project.environments.pop();
  project.rules.pop();
  assert.equal(snapshot(settings).projects[0].environments.length, 1);
  assert.deepEqual(snapshot(settings).projects[0].rules, []);
});
test('autosave preserves existing rules that remove matching text', () => {
  const project = createProject('Example');
  project.rules.push({ from: '/remove' });
  const settings = {
    version: 1,
    projects: [project],
    selectedProject: project.id,
  };
  const snapshot = createSettingsSnapshot();
  snapshot(settings, true);
  project.rules[0].from = '/updated';
  assert.deepEqual(snapshot(settings).projects[0].rules, [
    { from: '/updated' },
  ]);
});
test('migrate saved hosts, default and rules', async () => {
  values.set('sync:listOfHosts', ['localhost:3000', 'https://example.org']);
  values.set('sync:currentHost', 'https://example.org');
  values.set('sync:ruleList', [{ from: '/old', to: '/new' }]);
  const settings = await loadSettings();
  const p = settings.projects[0];
  assert.equal(p.environments.length, 2);
  assert.equal(settings.iconAction, 'local');
  assert.equal(p.defaultEnvironment, p.environments[1].id);
  assert.deepEqual(p.rules, [{ from: '/old', to: '/new' }]);
});

test('loopback HTTP and reject FTP', () => {
  assert.equal(addressUrl('127.0.0.1:3000').protocol, 'http:');
  assert.equal(addressUrl('[::1]:3000').protocol, 'http:');
  assert.throws(() => addressUrl('ftp://example.com'));
});

test('migration IDs stay stable until settings are saved', async () => {
  const first = await loadSettings();
  const second = await loadSettings();
  assert.equal(first.selectedProject, second.selectedProject);
  assert.deepEqual(
    first.projects[0].environments.map((e) => e.id),
    second.projects[0].environments.map((e) => e.id),
  );
});

test('only fresh users default to popup; existing choices survive loading and saving', async () => {
  const before = structuredClone([...values]);
  try {
    values.clear();
    const fresh = await loadSettings();
    assert.equal(fresh.iconAction, 'popup');
    values.set('sync:listOfHosts', []);
    const legacy = await loadSettings();
    assert.equal(legacy.iconAction, 'local');
    await saveSettings(legacy, false);
    assert.equal((await loadSettings()).iconAction, 'local');
    values.set(SETTINGS_KEY, { ...fresh, iconAction: undefined });
    assert.equal((await loadSettings()).iconAction, 'local');
    await saveSettings(fresh, false);
    assert.equal((await loadSettings()).iconAction, 'local');
    for (const iconAction of ['popup', 'local']) {
      await saveSettings({ ...fresh, iconAction });
      assert.equal((await loadSettings()).iconAction, iconAction);
    }
  } finally {
    values.clear();
    for (const [key, value] of before) values.set(key, value);
  }
});

test('update preserves all legacy data, including an orphan selected host and history', async () => {
  values.clear();
  writes.length = 0;
  const legacy = {
    'sync:listOfHosts': ['https://first.example', 'localhost:3000'],
    'sync:currentHost': 'https://removed-but-selected.example',
    'sync:ruleList': [{ from: '/app' }, { from: '/old', to: '/new' }],
    'sync:history': ['https://first.example/app?id=42#details'],
  };
  for (const [key, value] of Object.entries(legacy))
    values.set(key, structuredClone(value));
  const migrated = await loadSettings();
  const p = migrated.projects[0];
  assert.deepEqual(
    p.environments.map((e) => e.address),
    [...legacy['sync:listOfHosts'], legacy['sync:currentHost']],
  );
  assert.equal(
    p.environments.find((e) => e.id === p.defaultEnvironment).address,
    legacy['sync:currentHost'],
  );
  assert.deepEqual(p.rules, legacy['sync:ruleList']);
  assert.deepEqual(
    writes,
    [],
    'reading during update must not write or clear storage',
  );
  await saveSettings(migrated);
  assert.deepEqual(writes, [SETTINGS_KEY]);
  for (const [key, value] of Object.entries(legacy))
    assert.deepEqual(values.get(key), value);
  assert.deepEqual(
    await loadSettings(),
    migrated,
    'next launch loads the saved migration',
  );
});

test('existing new settings take priority over legacy backup on subsequent updates', async () => {
  const existing = await loadSettings();
  existing.projects[0].name = 'Renamed after migration';
  await saveSettings(existing);
  values.set('sync:listOfHosts', ['https://stale-backup.example']);
  assert.deepEqual(await loadSettings(), existing);
});

test('failed save and unsupported versions never overwrite existing or legacy data', async () => {
  const before = structuredClone([...values]);
  failWrites = true;
  try {
    await assert.rejects(saveSettings(await loadSettings()), /QUOTA/);
  } finally {
    failWrites = false;
  }
  assert.deepEqual([...values], before);
  const future = { version: 2, projects: [] };
  values.set(SETTINGS_KEY, future);
  const writeCount = writes.length;
  await assert.rejects(loadSettings(), /версия 1/);
  assert.deepEqual(values.get(SETTINGS_KEY), future);
  assert.equal(writes.length, writeCount);
  values.clear();
});
