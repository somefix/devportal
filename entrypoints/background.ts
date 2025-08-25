import { normalizePath, normalizeUrl } from '@/shared/utils';

import { getSyncedStorageName, HISTORY_STORAGE_NAME, RULES_STORAGE_NAME, CURRENT_HOST_STORAGE_NAME } from '@/entrypoints/options/constants';

export default defineBackground(() => {

  // Максимальное количество элементов в истории
  const MAX_HISTORY_ITEMS = 50;

  // Функция для открытия ссылки с заменой хоста
  async function openLink(url: string) {
    try {
      // Получаем основной хост и правила подмены
      const rules = await storage.getItem<{ from: string, to: string }[]>(getSyncedStorageName(RULES_STORAGE_NAME)) ?? [];
      const currentHost = await storage.getItem<string>(getSyncedStorageName(CURRENT_HOST_STORAGE_NAME)) ?? null;

      if (!currentHost) {
        throw new Error('Хост для замены отсутствует.');
      }

      const targetUrl = new URL(url);
      // const currentHostUrl = new URL(currentHost);
      let targetPath = targetUrl.pathname;

      // Применяем правила замены
      rules.forEach(rule => targetPath = targetPath.replace(rule.from, rule.to));

      const normalizedPath = normalizePath(targetPath);

      // Создаем новый URL, сохраняя путь и параметры
      const newUrl = `${currentHost}${normalizedPath}${targetUrl.search}`;
      const normalizedNewUrl = normalizeUrl(newUrl);

      // Открываем новую вкладку с измененным URL
      await browser.tabs.create({ url: normalizedNewUrl });

      // Сохраняем URL в историю
      await saveToHistory(url);
    } catch (error) {
      console.error('Ошибка при открытии ссылки:', error);
      // alert(error);
      // TODO: Добавить колбэк функцию, которая будет отображать ошибку на странице параметров
      browser.runtime.openOptionsPage();
    }
  }

  // Функция для сохранения URL в историю
  async function saveToHistory(url: string) {
    try {
      // Получаем текущую историю
      const history = await storage.getItem<string[]>(getSyncedStorageName(HISTORY_STORAGE_NAME)) ?? [];

      // Удаляем URL из истории, если он уже есть
      const filteredHistory = history.filter(item => item !== url);

      // Добавляем URL в начало истории
      filteredHistory.unshift(url);

      // Ограничиваем размер истории
      const trimmedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);

      // Сохраняем обновленную историю
      await storage.setItem(getSyncedStorageName(HISTORY_STORAGE_NAME), trimmedHistory);
    } catch (error) {
      console.error('Ошибка при сохранении в историю:', error);
    }
  }

  // Обработчик клика по иконке расширения
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.url) {
      await openLink(tab.url);
    }
  });
});
