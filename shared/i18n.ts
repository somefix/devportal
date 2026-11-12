import { ref, watch } from 'vue';
import { storage } from 'wxt/utils/storage';

export type Language = 'ru' | 'en';
export const language = ref<Language>('ru');
const messages = {
  settings: ['Настройки Devportal', 'Devportal settings'],
  import: ['Импорт JSON', 'Import JSON'],
  export: ['Экспорт JSON', 'Export JSON'],
  addProject: ['Добавить проект', 'Add project'],
  rename: ['Переименовать', 'Rename'],
  deleteProject: ['Удалить проект', 'Delete project'],
  confirmDelete: ['Удалить проект?', 'Delete project?'],
  environments: ['Окружения', 'Environments'],
  name: ['Название', 'Name'],
  address: ['Адрес', 'Address'],
  setDefaultEnvironment: ['Выбрать по умолчанию', 'Set as default'],
  deleteEnvironment: ['Удалить окружение', 'Delete environment'],
  addEnvironment: ['Добавить окружение', 'Add environment'],
  rules: ['Правила URL проекта', 'Project URL rules'],
  preserve: [
    'Сохранять параметры и #hash',
    'Preserve query parameters and #hash',
  ],
  addRule: ['Добавить правило', 'Add rule'],
  from: ['Что заменить', 'Find'],
  to: ['На что заменить', 'Replace with'],
  deleteRule: ['Удалить правило', 'Delete rule'],
  copyLocal: ['Скопировать Local', 'Copy Local URL'],
  general: ['Общие настройки', 'General settings'],
  allProjects: ['Применяются ко всем проектам', 'Apply to all projects'],
  openLinks: ['Открывать ссылки', 'Open links'],
  newTab: ['В новой вкладке', 'In a new tab'],
  currentTab: ['В текущей вкладке', 'In the current tab'],
  shortcut: ['Горячие клавиши', 'Keyboard shortcuts'],
  openDefaultEnvironment: [
    'Открыть окружение по умолчанию',
    'Open default environment',
  ],
  toggleModeShortcut: [
    'Переключить действие иконки: попап ↔ окружение по умолчанию',
    'Switch icon click action: popup ↔ default environment',
  ],
  noShortcut: ['Не назначена', 'Unassigned'],
  configure: ['Настроить в Chrome', 'Configure in Chrome'],
  saveError: ['Не удалось сохранить настройки.', 'Could not save settings.'],
  copied: ['Адрес скопирован', 'URL copied'],
  copyError: ['Не удалось скопировать адрес', 'Could not copy URL'],
  imported: ['Настройки импортированы.', 'Settings imported.'],
  largeFile: ['Файл слишком большой', 'File is too large'],
  empty: [
    'Добавьте проект и укажите адреса окружений.',
    'Add a project and enter its environment URLs.',
  ],
  cancel: ['Отмена', 'Cancel'],
  done: ['Готово', 'Done'],
  projectName: ['Название проекта', 'Project name'],
  exampleName: ['Например, Личный кабинет', 'For example, Customer portal'],
  actions: ['Действия', 'Actions'],
  here: ['Вы здесь', 'You are here'],
  chooseProject: ['Выберите проект', 'Choose a project'],
  openSettings: ['Открыть настройки', 'Open settings'],
  keyboard: ['↑↓ — выбрать · Enter — открыть', '↑↓ — select · Enter — open'],
  noWebPage: [
    'Откройте веб-страницу с адресом HTTP или HTTPS.',
    'Open an HTTP or HTTPS web page.',
  ],
  iconAction: ['По клику на иконку', 'On extension icon click'],
  popup: ['Показать попап', 'Show popup'],
  openEnvironmentShortcut: ['Открыть окружение', 'Open environment'],
  switchModeShortcut: ['Переключить режим', 'Switch mode'],
  popupModeHint: [
    'По клику на иконку: включено — показать попап, выключено — открыть окружение по умолчанию. Применяется ко всем проектам.',
    'On icon click: enabled — show popup, disabled — open the default environment. Applies to all projects.',
  ],
  history: ['История', 'History'],
  historyUrl: ['Исходный URL', 'Source URL'],
  moreEnvironments: ['Другие окружения', 'More environments'],
  clearHistory: ['Очистить историю', 'Clear history'],
  emptyHistory: ['История пока пуста.', 'History is empty.'],
} as const;
export type MessageKey = keyof typeof messages;
export const t = (key: MessageKey): string => {
  return messages[key][language.value === 'en' ? 1 : 0];
};
export const loadLanguage = async () => {
  const saved = await storage.getItem<Language>('sync:language');
  language.value = saved === 'en' ? 'en' : 'ru';
};
watch(language, (value) => {
  document.documentElement.lang = value;
  document.title = document.body.classList.contains('popup')
    ? 'Devportal'
    : t('settings');
});
export const changeLanguage = async (value: Language) => {
  await storage.setItem('sync:language', value);
  language.value = value;
};

const errorTranslations: Record<string, string> = {
  'Укажите адрес окружения.': 'Enter an environment URL.',
  'Допустимы только HTTP и HTTPS.': 'Only HTTP and HTTPS are supported.',
  'Допустимы только HTTP и HTTPS без логина и пароля.':
    'Use HTTP or HTTPS without a username or password.',
  'Откройте веб-страницу с адресом HTTP или HTTPS.':
    'Open an HTTP or HTTPS web page.',
  'Некорректный файл настроек (версия 1, до 30 проектов).':
    'Invalid settings file (version 1, up to 30 projects).',
  'Некорректное действие иконки.': 'Invalid extension icon action.',
  'Некорректные настройки проекта.': 'Invalid project settings.',
  'Некорректное окружение.': 'Invalid environment.',
  'Окружение по умолчанию отсутствует.':
    'The default environment does not exist.',
  'Некорректные правила URL.': 'Invalid URL rules.',
  'Текущая вкладка недоступна.': 'The current tab is unavailable.',
  'Окружение недоступно.': 'The environment is unavailable.',
  'Фоновый процесс расширения не ответил.':
    'The extension background process did not respond.',
};
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return language.value === 'en'
    ? (errorTranslations[message] ?? message)
    : message;
};
