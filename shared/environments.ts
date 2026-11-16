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
  preserveSuffix: boolean;
  newTab: boolean;
  rules: {
    from: string;
    to?: string;
    match?: 'path-prefix';
  }[];
}
export interface Settings {
  version: 1;
  iconAction?: 'popup' | 'local';
  projects: Project[];
  selectedProject: string;
}
export const SETTINGS_KEY = 'sync:environmentSettings';
export const UPDATE_NOTICE_KEY = 'local:pendingUpdateVersion';
export const HISTORY_KEY = 'sync:history';
export type BackgroundRequest =
  | {
      type: 'devportal:open-environment';
      projectId: string;
      environmentId: string;
      source: string;
      tabId?: number;
      newTab: boolean;
      reopenCurrent?: boolean;
    }
  | { type: 'devportal:open-history-source'; source: string }
  | { type: 'devportal:clear-history' };

export type BackgroundResponse = { ok: true } | { ok: false; error: string };

export const sendBackgroundRequest = async (request: BackgroundRequest) => {
  const response: BackgroundResponse | undefined =
    await browser.runtime.sendMessage(request);
  if (response?.ok === true) return;
  if (response?.ok === false) throw new Error(response.error);
  throw new Error('Фоновый процесс расширения не ответил.');
};
export const colors = ['#58bf4b', '#1769ff', '#ffb000', '#ed4552'];
export const createProject = (name = 'Новый проект'): Project => {
  const local = {
    id: crypto.randomUUID(),
    name: 'Local',
    address: 'localhost:3000',
    color: colors[0]!,
  };
  return {
    id: crypto.randomUUID(),
    name,
    environments: [local],
    defaultEnvironment: local.id,
    preserveSuffix: true,
    newTab: true,
    rules: [],
  };
};
export const addressUrl = (address: string): URL => {
  const value = address.trim();
  if (!value) throw new Error('Укажите адрес окружения.');
  const hasHttpScheme = /^https?:\/\//i.test(value);
  const hasExplicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
  if (hasExplicitScheme && !hasHttpScheme) {
    throw new Error('Допустимы только HTTP и HTTPS.');
  }

  const isLoopback =
    /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/|$)/i.test(value);
  const defaultScheme = isLoopback ? 'http' : 'https';
  const url = new URL(hasHttpScheme ? value : `${defaultScheme}://${value}`);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Допустимы только HTTP и HTTPS без логина и пароля.');
  return url;
};
export const isValidEnvironmentAddress = (address: string): boolean => {
  try {
    addressUrl(address);
    return true;
  } catch {
    return false;
  }
};

export const createSettingsSnapshot = () => {
  type Rule = Project['rules'][number];
  const completeEnvironments = new WeakMap<Environment, Environment>();
  const completeRules = new WeakMap<Rule, Rule>();

  return (settings: Settings, loaded = false): Settings => ({
    ...settings,
    projects: settings.projects.map((project) => {
      const environments = project.environments.flatMap((environment) => {
        if (
          environment.name.trim() &&
          isValidEnvironmentAddress(environment.address)
        )
          completeEnvironments.set(environment, { ...environment });
        return completeEnvironments.get(environment) ?? [];
      });
      const rules = project.rules.flatMap((rule) => {
        const previous = completeRules.get(rule);
        // Existing rules may intentionally delete the matched text.
        if (
          rule.from.trim() &&
          (rule.to?.trim() || loaded || (previous && !previous.to?.trim()))
        )
          completeRules.set(rule, { ...rule });
        return completeRules.get(rule) ?? [];
      });
      const defaultEnvironment =
        project.defaultEnvironment &&
        !environments.some((env) => env.id === project.defaultEnvironment)
          ? (environments[0]?.id ?? '')
          : project.defaultEnvironment;
      return { ...project, environments, rules, defaultEnvironment };
    }),
  });
};

const sourceUrl = (source: string): URL => {
  const url = new URL(source);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Откройте веб-страницу с адресом HTTP или HTTPS.');
  return url;
};

export const transformUrl = (
  source: string,
  project: Project,
  environment: Environment,
  reopenCurrent = false,
): string => {
  const input = sourceUrl(source);
  const target = addressUrl(environment.address);
  const basePath = target.pathname.replace(/\/$/, '');
  if (
    reopenCurrent &&
    input.origin === target.origin &&
    (input.pathname === basePath || input.pathname.startsWith(basePath + '/'))
  )
    return input.href;
  let path = input.pathname;
  for (const rule of project.rules) {
    if (!rule.from) continue;
    if (rule.match === 'path-prefix') {
      const prefix = '/' + rule.from.replace(/^\/+|\/+$/g, '');
      if (prefix !== '/' && (path === prefix || path.startsWith(prefix + '/')))
        path =
          (rule.to ?? '').replace(/\/$/, '') + path.slice(prefix.length) || '/';
    } else {
      path = path.replace(rule.from, rule.to ?? '');
    }
  }
  target.pathname = `${basePath}/${path.replace(/^\/+/, '')}`;
  target.search = project.preserveSuffix ? input.search : '';
  target.hash = project.preserveSuffix ? input.hash : '';
  return target.href;
};

export const validateSettings = (value: unknown): Settings => {
  const data = value as Omit<Settings, 'projects'> & {
    projects: (Project & { stripPrefix?: string })[];
  };
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
      (p.stripPrefix !== undefined && typeof p.stripPrefix !== 'string') ||
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
          (r.to !== undefined && typeof r.to !== 'string') ||
          (r.match !== undefined && r.match !== 'path-prefix'),
      )
    )
      throw new Error('Некорректные правила URL.');
  }
  for (const project of data.projects) {
    if (project.stripPrefix === undefined) continue;
    const prefix = project.stripPrefix.replace(/^\/+|\/+$/g, '');
    if (prefix)
      project.rules.unshift({
        from: '/' + prefix,
        to: '/',
        match: 'path-prefix',
      });
    delete project.stripPrefix;
  }
  if (data.projects.length && !ids.has(data.selectedProject))
    data.selectedProject = data.projects[0]!.id;
  return data;
};
export const loadSettings = async (): Promise<Settings> => {
  const saved = await storage.getItem<Settings>(SETTINGS_KEY);
  if (saved)
    return validateSettings({
      ...saved,
      iconAction: saved.iconAction ?? 'local',
    });
  const legacyHosts = await storage.getItem<string[]>('sync:listOfHosts');
  const current = await storage.getItem<string>('sync:currentHost');
  const legacyRules = await storage.getItem<Project['rules']>('sync:ruleList');
  const hasLegacySettings =
    legacyHosts != null || current != null || legacyRules != null;
  // Older versions could retain a selected host after removing it from the list.
  // Keep that address too, without changing any legacy storage keys.
  const hosts = [...(legacyHosts ?? [])];
  if (current && !hosts.includes(current)) hosts.push(current);
  const project = createProject('Мой проект');
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
  project.rules = legacyRules ?? [];
  return {
    version: 1,
    iconAction: hasLegacySettings ? 'local' : 'popup',
    projects: [project],
    selectedProject: project.id,
  };
};
const writeSettings = async (settings: Settings): Promise<void> => {
  const validated = validateSettings(JSON.parse(JSON.stringify(settings)));
  // Only the new key is written. Legacy data remains available as a backup.
  await storage.setItem(SETTINGS_KEY, validated);
};

export const saveSettings = (
  settings: Settings,
  replaceIconAction = true,
): Promise<void> => {
  return navigator.locks.request(SETTINGS_KEY, async () => {
    if (replaceIconAction) return writeSettings(settings);

    const saved = await storage.getItem<Settings>(SETTINGS_KEY);
    await writeSettings({
      ...settings,
      iconAction: saved ? (saved.iconAction ?? 'local') : settings.iconAction,
    });
  });
};

export const toggleIconAction = (): Promise<void> => {
  return navigator.locks.request(SETTINGS_KEY, async () => {
    const settings = await loadSettings();
    const iconAction = settings.iconAction === 'local' ? 'popup' : 'local';
    await writeSettings({ ...settings, iconAction });
  });
};
export const detectProject = (
  settings: Settings,
  source: string,
): Project | undefined => {
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
};

let historyWrites = Promise.resolve();
const updateHistory = (update: (history: string[]) => string[]) => {
  const write = historyWrites.then(async () => {
    const history = (await storage.getItem<string[]>(HISTORY_KEY)) ?? [];
    await storage.setItem(HISTORY_KEY, update(history));
  });
  historyWrites = write.catch(() => {});
  return write;
};

export const clearSwitchHistory = () => {
  return updateHistory(() => []);
};

const recordHistory = (source: string) => {
  return updateHistory((history) =>
    [...new Set([source, ...history])].slice(0, 50),
  );
};

export const openHistorySource = async (source: string) => {
  await browser.tabs.create({ url: sourceUrl(source).href });
  await recordHistory(source);
};

export const openEnvironment = async (
  source: string,
  project: Project,
  environment: Environment,
  tabId?: number,
  newTab = project.newTab,
  reopenCurrent = false,
) => {
  const url = transformUrl(source, project, environment, reopenCurrent);
  if (newTab) await browser.tabs.create({ url });
  else if (tabId !== undefined) await browser.tabs.update(tabId, { url });
  else throw new Error('Текущая вкладка недоступна.');
  await recordHistory(source);
};
