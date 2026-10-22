import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Load the pure URL functions without the extension-only storage adapter.
const source = readFileSync(new URL('../shared/environments.ts', import.meta.url), 'utf8').replace("import { storage } from 'wxt/utils/storage';", 'const storage = globalThis.__testStorage;');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const values = new Map();
const writes = [];
let failWrites = false;
globalThis.__testStorage = {
  getItem: async key => structuredClone(values.get(key)),
  setItem: async (key, value) => {
    if (failWrites) throw new Error('QUOTA_BYTES_PER_ITEM');
    writes.push(key);
    values.set(key, structuredClone(value));
  },
};
const { createProject, transformUrl, validateSettings, detectProject, loadSettings, saveSettings, SETTINGS_KEY, addressUrl } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const project = createProject('Test');
project.environments[0].address = 'localhost:5173';
project.environments[3].address = 'https://example.com';
project.defaultEnvironment = project.environments[0].id;
project.stripPrefix = '/app';
const local = project.environments[0];
test('local HTTP, prefix, query and hash', () => assert.equal(transformUrl('https://example.com/app/tasks/123?tab=history#item', project, local), 'http://localhost:5173/tasks/123?tab=history#item'));
test('prefix matches full path segment only', () => assert.equal(transformUrl('https://example.com/application', project, local), 'http://localhost:5173/application'));
test('suffix can be removed', () => assert.equal(transformUrl('https://example.com/app?a=1#b', { ...project, preserveSuffix: false }, local), 'http://localhost:5173/'));
test('explicit HTTPS and target base path survive', () => assert.equal(transformUrl('https://example.com/app/tasks', project, { ...local, address: 'https://localhost:5173/base' }), 'https://localhost:5173/base/tasks'));
test('legacy replacement rules work', () => assert.equal(transformUrl('https://example.com/app/tasks', { ...project, rules: [{ from: 'tasks', to: 'issues' }] }, local), 'http://localhost:5173/issues'));
test('reject browser internal pages and credentials', () => { assert.throws(() => transformUrl('chrome://settings', project, local)); assert.throws(() => addressUrl('https://user:pass@example.com')); });
test('detect project by exact host and port', () => { const settings = { projects: [project] }; assert.equal(detectProject(settings, 'https://example.com/app')?.id, project.id); assert.equal(detectProject(settings, 'https://example.com.evil.test'), undefined); assert.equal(detectProject(settings, 'http://localhost:5174'), undefined); });
test('validate import and reject duplicate IDs', () => { const settings = { version: 1, projects: [project], selectedProject: project.id }; assert.equal(validateSettings(settings), settings); assert.throws(() => validateSettings({ ...settings, projects: [project, project] })); assert.throws(() => validateSettings({ version: 2, projects: [] })); });
test('migrate saved hosts, default and rules', async () => { values.set('sync:listOfHosts', ['localhost:3000', 'https://example.org']); values.set('sync:currentHost', 'https://example.org'); values.set('sync:ruleList', [{ from: '/old', to: '/new' }]); const settings = await loadSettings(); const p = settings.projects[0]; assert.equal(p.environments.length, 2); assert.equal(p.defaultEnvironment, p.environments[1].id); assert.deepEqual(p.rules, [{ from: '/old', to: '/new' }]); });

test('loopback HTTP and reject FTP', () => { assert.equal(addressUrl('127.0.0.1:3000').protocol, 'http:'); assert.equal(addressUrl('[::1]:3000').protocol, 'http:'); assert.throws(() => addressUrl('ftp://example.com')); });

test('migration IDs stay stable until settings are saved', async () => { const first = await loadSettings(); const second = await loadSettings(); assert.equal(first.selectedProject, second.selectedProject); assert.deepEqual(first.projects[0].environments.map(e => e.id), second.projects[0].environments.map(e => e.id)); });


test('update preserves all legacy data, including an orphan selected host and history', async () => {
  values.clear(); writes.length = 0;
  const legacy = {
    'sync:listOfHosts': ['https://first.example', 'localhost:3000'],
    'sync:currentHost': 'https://removed-but-selected.example',
    'sync:ruleList': [{ from: '/app' }, { from: '/old', to: '/new' }],
    'sync:history': ['https://first.example/app?id=42#details'],
  };
  for (const [key, value] of Object.entries(legacy)) values.set(key, structuredClone(value));
  const migrated = await loadSettings();
  const p = migrated.projects[0];
  assert.deepEqual(p.environments.map(e => e.address), [...legacy['sync:listOfHosts'], legacy['sync:currentHost']]);
  assert.equal(p.environments.find(e => e.id === p.defaultEnvironment).address, legacy['sync:currentHost']);
  assert.deepEqual(p.rules, legacy['sync:ruleList']);
  assert.deepEqual(writes, [], 'reading during update must not write or clear storage');
  await saveSettings(migrated);
  assert.deepEqual(writes, [SETTINGS_KEY]);
  for (const [key, value] of Object.entries(legacy)) assert.deepEqual(values.get(key), value);
  assert.deepEqual(await loadSettings(), migrated, 'next launch loads the saved migration');
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
  try { await assert.rejects(saveSettings(await loadSettings()), /QUOTA/); }
  finally { failWrites = false; }
  assert.deepEqual([...values], before);
  const future = { version: 2, projects: [] };
  values.set(SETTINGS_KEY, future);
  const writeCount = writes.length;
  await assert.rejects(loadSettings(), /версия 1/);
  assert.deepEqual(values.get(SETTINGS_KEY), future);
  assert.equal(writes.length, writeCount);
  values.clear();
});
