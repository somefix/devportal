import {
  loadSettings,
  detectProject,
  openEnvironment,
} from '@/shared/environments';
import { storage } from 'wxt/utils/storage';
export default defineBackground(() => {
  async function configureAction() {
    const settings = await loadSettings();
    await browser.action.setPopup({
      popup: settings.iconAction === 'local' ? '' : '/popup.html',
    });
  }
  void configureAction();
  browser.action.onClicked.addListener(async (tab) => {
    try {
      const settings = await loadSettings();
      const project =
        detectProject(settings, tab.url ?? '') ??
        settings.projects.find((p) => p.id === settings.selectedProject);
      const local = project?.environments.find(
        (e) => e.name.trim().toLowerCase() === 'local',
      );
      if (!project || !local?.address.trim() || !tab.url)
        throw new Error('Настройте Local');
      await openEnvironment(tab.url, project, local, tab.id);
    } catch {
      await browser.runtime.openOptionsPage();
    }
  });
  async function rebuildMenus() {
    await browser.contextMenus.removeAll();
    const settings = await loadSettings();
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
  }
  void rebuildMenus();
  browser.runtime.onInstalled.addListener(() => {
    void rebuildMenus();
  });
  browser.runtime.onStartup.addListener(() => {
    void rebuildMenus();
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && (changes.environmentSettings || changes.language)) {
      void rebuildMenus();
      void configureAction();
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
    if (command !== 'switch-environment') return;
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
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
    } catch {
      await browser.runtime.openOptionsPage();
    }
  });
});
