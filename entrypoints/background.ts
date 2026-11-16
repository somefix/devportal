import {
  type BackgroundRequest,
  type BackgroundResponse,
  type Settings,
  UPDATE_NOTICE_KEY,
  clearSwitchHistory,
  loadSettings,
  toggleIconAction,
  detectProject,
  openEnvironment,
  openHistorySource,
} from '@/shared/environments';
import { storage } from 'wxt/utils/storage';

export default defineBackground(() => {
  const action = browser.action ?? browser.browserAction;
  const openRequestedEnvironment = async (
    request: Extract<BackgroundRequest, { type: 'devportal:open-environment' }>,
  ) => {
    const settings = await loadSettings();
    const project = settings.projects.find(
      (item) => item.id === request.projectId,
    );
    const environment = project?.environments.find(
      (item) => item.id === request.environmentId,
    );
    if (!project || !environment) throw new Error('Окружение недоступно.');
    await openEnvironment(
      request.source,
      project,
      environment,
      request.tabId,
      request.newTab,
      request.reopenCurrent,
    );
  };
  const handleRequest = (request: BackgroundRequest) => {
    switch (request?.type) {
      case 'devportal:open-environment':
        return openRequestedEnvironment(request);
      case 'devportal:open-history-source':
        return openHistorySource(request.source);
      case 'devportal:clear-history':
        return clearSwitchHistory();
    }
  };
  browser.runtime.onMessage.addListener(
    (request: BackgroundRequest, _sender, respond) => {
      const operation = handleRequest(request);
      if (!operation) return;
      void operation
        .then<BackgroundResponse, BackgroundResponse>(
          () => ({ ok: true }),
          (error: unknown) => ({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        )
        .then(respond);
      return true;
    },
  );
  const rebuildMenus = async (settings: Settings) => {
    await browser.contextMenus.removeAll();
    const project = settings.projects.find(
      (p) => p.id === settings.selectedProject,
    );
    if (!project) return;
    const english = (await storage.getItem('sync:language')) === 'en';
    browser.contextMenus.create({
      id: 'devportal',
      title: english
        ? 'Devportal — Open in environment'
        : 'Devportal — Открыть на стенде',
      contexts: ['link'],
    });
    for (const env of project.environments.filter((e) => e.address.trim())) {
      browser.contextMenus.create({
        id: `open:${env.id}`,
        parentId: 'devportal',
        title: env.name,
        contexts: ['link'],
      });
    }
    const local = project.environments.find(
      (e) => e.name.trim().toLowerCase() === 'local' && e.address.trim(),
    );
    if (local) {
      browser.contextMenus.create({
        id: 'devportal-separator',
        parentId: 'devportal',
        type: 'separator',
        contexts: ['link'],
      });
      browser.contextMenus.create({
        id: `copy:${local.id}`,
        parentId: 'devportal',
        title: english ? 'Copy Local URL' : 'Скопировать адрес Local',
        contexts: ['link'],
      });
    }
  };

  let refresh = Promise.resolve();
  const refreshActionAndMenus = () => {
    refresh = refresh
      .then(async () => {
        const settings = await loadSettings();
        await action.setPopup({
          popup: settings.iconAction === 'local' ? '' : '/popup.html',
        });
        await rebuildMenus(settings);
        const pendingVersion = await storage.getItem<string>(UPDATE_NOTICE_KEY);
        const english = (await storage.getItem('sync:language')) === 'en';
        await action.setBadgeBackgroundColor({ color: '#2563eb' });
        await action.setBadgeText({ text: pendingVersion ? 'NEW' : '' });
        await action.setTitle({
          title: pendingVersion
            ? english
              ? 'Devportal updated — open extension options to see what’s new'
              : 'Devportal обновился — откройте параметры расширения'
            : 'Devportal',
        });
      })
      .catch(console.error);
  };
  const openDefaultEnvironment = async (tab?: {
    id?: number;
    url?: string;
  }) => {
    const settings = await loadSettings();
    const project =
      detectProject(settings, tab?.url ?? '') ??
      settings.projects.find((p) => p.id === settings.selectedProject);
    const environment = project?.environments.find(
      (e) => e.id === project.defaultEnvironment,
    );
    if (!project || !environment || !tab?.url)
      throw new Error('Настройте окружение');
    await openEnvironment(tab.url, project, environment, tab.id);
  };
  action.onClicked.addListener(async (tab) => {
    try {
      await openDefaultEnvironment(tab);
    } catch {
      await browser.runtime.openOptionsPage();
    }
  });
  refreshActionAndMenus();
  browser.runtime.onInstalled.addListener(async (details) => {
    if (
      details.reason === 'update' &&
      details.previousVersion !== browser.runtime.getManifest().version
    ) {
      await storage.setItem(
        UPDATE_NOTICE_KEY,
        browser.runtime.getManifest().version,
      );
    }
    refreshActionAndMenus();
  });
  browser.runtime.onStartup.addListener(refreshActionAndMenus);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && (changes.environmentSettings || changes.language)) {
      refreshActionAndMenus();
    }
    if (area === 'local' && changes.pendingUpdateVersion) {
      refreshActionAndMenus();
    }
  });
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      const settings = await loadSettings();
      const source = info.linkUrl;
      if (!source) return;
      const [action, id] = String(info.menuItemId).split(':');
      const project = settings.projects.find((p) =>
        p.environments.some((e) => e.id === id),
      );
      const environment = project?.environments.find((e) => e.id === id);
      if (!project || !environment) return;
      if (action === 'open')
        await openEnvironment(source, project, environment, tab?.id);
      else
        await browser.tabs.create({
          url:
            browser.runtime.getURL('/popup.html') +
            `?copy=${encodeURIComponent(source)}&project=${project.id}&environment=${id}`,
        });
    } catch {
      await browser.runtime.openOptionsPage();
    }
  });
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-icon-action') {
      try {
        await toggleIconAction();
      } catch (error) {
        console.error(error);
      }
      return;
    }
    if (command !== 'switch-environment') return;
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      await openDefaultEnvironment(tab);
    } catch {
      await browser.runtime.openOptionsPage();
    }
  });
});
