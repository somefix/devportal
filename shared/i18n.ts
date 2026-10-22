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
  confirmDelete: [
    'Удалить проект? Изменение вступит в силу после сохранения.',
    'Delete project? This takes effect after saving.',
  ],
  environments: ['Окружения', 'Environments'],
  name: ['Название', 'Name'],
  address: ['Адрес', 'Address'],
  default: ['По умолчанию', 'Default'],
  deleteEnvironment: ['Удалить окружение', 'Delete environment'],
  addEnvironment: ['Добавить окружение', 'Add environment'],
  newEnvironment: ['Новое', 'New'],
  rules: ['Правила URL проекта', 'Project URL rules'],
  prefix: ['Убрать префикс', 'Remove prefix'],
  preserve: [
    'Сохранять параметры и #hash',
    'Preserve query parameters and #hash',
  ],
  addRule: ['Добавить правило', 'Add rule'],
  from: ['Что заменить', 'Find'],
  to: ['На что заменить', 'Replace with'],
  deleteRule: ['Удалить правило', 'Delete rule'],
  test: ['Проверка ссылки', 'Test a link'],
  source: ['Исходная ссылка', 'Source URL'],
  result: ['Результат для', 'Result for'],
  invalid: ['Введите корректные адреса', 'Enter valid URLs'],
  copy: ['Скопировать адрес', 'Copy URL'],
  general: ['Общие настройки', 'General settings'],
  allProjects: ['Применяются ко всем проектам', 'Apply to all projects'],
  openLinks: ['Открывать ссылки', 'Open links'],
  newTab: ['В новой вкладке', 'In a new tab'],
  currentTab: ['В текущей вкладке', 'In the current tab'],
  shortcut: ['Горячая клавиша', 'Keyboard shortcut'],
  configure: ['Настроить в Chrome', 'Configure in Chrome'],
  save: ['Сохранить изменения', 'Save changes'],
  saved: ['Настройки сохранены', 'Settings saved'],
  copied: ['Адрес скопирован', 'URL copied'],
  copyError: ['Не удалось скопировать адрес', 'Could not copy URL'],
  imported: [
    'Настройки импортированы. Нажмите «Сохранить изменения».',
    'Settings imported. Click “Save changes”.',
  ],
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
  openOn: ['Открыть на', 'Open on'],
  here: ['Вы здесь', 'You are here'],
  chooseProject: ['Выберите проект', 'Choose a project'],
  openSettings: ['Открыть настройки', 'Open settings'],
  keyboard: ['↑↓ — выбор', '↑↓ — select'],
  openEnvironment: ['Открыть на стенде', 'Open in environment'],
  iconAction: ['По клику на иконку', 'On extension icon click'],
  popup: ['Показать попап', 'Show popup'],
  local: ['Открыть Local', 'Open Local'],
  history: ['История', 'History'],
  clearHistory: ['Очистить историю', 'Clear history'],
  emptyHistory: ['История пока пуста.', 'History is empty.'],
} as const;
export type MessageKey = keyof typeof messages;
export function t(key: MessageKey): string {
  return messages[key][language.value === 'en' ? 1 : 0];
}
export async function loadLanguage() {
  const saved = await storage.getItem<Language>('sync:language');
  language.value = saved === 'en' ? 'en' : 'ru';
}
watch(language, (value) => {
  document.documentElement.lang = value;
  document.title = document.body.classList.contains('popup')
    ? 'Devportal'
    : t('settings');
});
export async function changeLanguage(value: Language) {
  await storage.setItem('sync:language', value);
  language.value = value;
}

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
};
export function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return language.value === 'en'
    ? (errorTranslations[message] ?? message)
    : message;
}
