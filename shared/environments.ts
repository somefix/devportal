import { storage } from 'wxt/utils/storage';
export interface Environment {
  id: string;
  name: string;
  address: string;
  color: string;
}
export interface Project {
  id: string;
  name: string;
  environments: Environment[];
  defaultEnvironment: string;
  stripPrefix: string;
  preserveSuffix: boolean;
  newTab: boolean;
  rules: {
    from: string;
    to?: string;
  }[];
}
export interface Settings {
  version: 1;
  iconAction?: 'popup' | 'local';
  projects: Project[];
  selectedProject: string;
}
export const SETTINGS_KEY = 'sync:environmentSettings';
export const colors = ['#58bf4b', '#1769ff', '#ffb000', '#ed4552'];
export function createProject(name = 'Новый проект'): Project {
  return {
    id: crypto.randomUUID(),
    name,
    environments: ['Local', 'Dev', 'Stage', 'Prod'].map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      address: '',
      color: colors[i] ?? '#1769ff',
    })),
    defaultEnvironment: '',
    stripPrefix: '',
    preserveSuffix: true,
    newTab: true,
    rules: [],
  };
}
export function addressUrl(address: string): URL {
  const value = address.trim();
  if (!value) throw new Error('Укажите адрес окружения.');
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value))
    throw new Error('Допустимы только HTTP и HTTPS.');
  const url = new URL(
    /^https?:\/\//i.test(value)
      ? value
      : `${/^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/|$)/i.test(value) ? 'http' : 'https'}://${value}`,
  );
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Допустимы только HTTP и HTTPS без логина и пароля.');
  return url;
}
export function transformUrl(
  source: string,
  project: Project,
  environment: Environment,
): string {
  const input = new URL(source);
  if (!['http:', 'https:'].includes(input.protocol))
    throw new Error('Откройте веб-страницу с адресом HTTP или HTTPS.');
  const target = addressUrl(environment.address);
  let path = input.pathname;
  const prefix = '/' + project.stripPrefix.replace(/^\/+|\/+$/g, '');
  if (prefix !== '/' && (path === prefix || path.startsWith(prefix + '/')))
    path = path.slice(prefix.length) || '/';
  for (const rule of project.rules)
    if (rule.from) path = path.replace(rule.from, rule.to ?? '');
  target.pathname = `${target.pathname.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
  target.search = project.preserveSuffix ? input.search : '';
  target.hash = project.preserveSuffix ? input.hash : '';
  return target.href;
}
export function validateSettings(value: unknown): Settings {
  const data = value as Settings;
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.projects) ||
    data.projects.length > 30
  )
    throw new Error('Некорректный файл настроек (версия 1, до 30 проектов).');
  if (
    data.iconAction !== undefined &&
    !['popup', 'local'].includes(data.iconAction)
  )
    throw new Error('Некорректное действие иконки.');
  const ids = new Set<string>();
  for (const p of data.projects) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      ids.has(p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      !Array.isArray(p.environments) ||
      p.environments.length > 20 ||
      typeof p.stripPrefix !== 'string' ||
      typeof p.newTab !== 'boolean' ||
      typeof p.preserveSuffix !== 'boolean' ||
      !Array.isArray(p.rules)
    )
      throw new Error('Некорректные настройки проекта.');
    ids.add(p.id);
    const envIds = new Set<string>();
    for (const e of p.environments) {
      if (
        !e ||
        typeof e.id !== 'string' ||
        envIds.has(e.id) ||
        typeof e.name !== 'string' ||
        !e.name.trim() ||
        typeof e.address !== 'string' ||
        typeof e.color !== 'string' ||
        !/^#[0-9a-f]{6}$/i.test(e.color)
      )
        throw new Error('Некорректное окружение.');
      envIds.add(e.id);
      if (e.address.trim()) addressUrl(e.address);
    }
    if (p.defaultEnvironment && !envIds.has(p.defaultEnvironment))
      throw new Error('Окружение по умолчанию отсутствует.');
    if (
      p.rules.some(
        (r) =>
          !r ||
          typeof r.from !== 'string' ||
          (r.to !== undefined && typeof r.to !== 'string'),
      )
    )
      throw new Error('Некорректные правила URL.');
  }
  if (data.projects.length && !ids.has(data.selectedProject))
    data.selectedProject = data.projects[0]!.id;
  return data;
}
export async function loadSettings(): Promise<Settings> {
  const saved = await storage.getItem<Settings>(SETTINGS_KEY);
  if (saved) return validateSettings(saved);
  const legacyHosts =
    (await storage.getItem<string[]>('sync:listOfHosts')) ?? [];
  const current = await storage.getItem<string>('sync:currentHost');
  // Older versions could retain a selected host after removing it from the list.
  // Keep that address too, without changing any legacy storage keys.
  const hosts = [...legacyHosts];
  if (current && !hosts.includes(current)) hosts.push(current);
  const project = createProject(hosts.length ? 'Мой проект' : 'Личный кабинет');
  if (hosts.length)
    project.environments = hosts.map((address, i) => ({
      id: crypto.randomUUID(),
      name: i === 0 ? 'Local' : `Окружение ${i + 1}`,
      address,
      color: colors[i % colors.length] ?? '#1769ff',
    }));
  // Stable IDs keep migrated context-menu actions valid before the first save.
  project.id = 'legacy-project';
  project.environments.forEach((environment, index) => {
    environment.id = `legacy-environment-${index}`;
  });
  project.defaultEnvironment =
    (
      project.environments.find((e) => e.address === current) ??
      project.environments[0]
    )?.id ?? '';
  project.rules = (await storage.getItem('sync:ruleList')) ?? [];
  return { version: 1, projects: [project], selectedProject: project.id };
}
export async function saveSettings(settings: Settings): Promise<void> {
  const validated = validateSettings(JSON.parse(JSON.stringify(settings)));
  // Only the new key is written. Legacy data remains available as a backup.
  await storage.setItem(SETTINGS_KEY, validated);
}
export function detectProject(
  settings: Settings,
  source: string,
): Project | undefined {
  try {
    const host = new URL(source).host;
    return settings.projects.find((p) =>
      p.environments.some((e) => {
        try {
          return addressUrl(e.address).host === host;
        } catch {
          return false;
        }
      }),
    );
  } catch {
    return undefined;
  }
}
export async function openEnvironment(
  source: string,
  project: Project,
  environment: Environment,
  tabId?: number,
  newTab = project.newTab,
) {
  const url = transformUrl(source, project, environment);
  if (newTab) await browser.tabs.create({ url });
  else if (tabId !== undefined) await browser.tabs.update(tabId, { url });
  else throw new Error('Текущая вкладка недоступна.');
  const history = (await storage.getItem<string[]>('sync:history')) ?? [];
  await storage.setItem(
    'sync:history',
    [source, ...history.filter((x) => x !== source)].slice(0, 50),
  );
}
