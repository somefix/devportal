import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-vue'],
  autoIcons: {
    developmentIndicator: false,
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Devportal',
    version: '1.1.0',
    description:
      'Переключайтесь между продом, тестом и локалкой без ручного редактирования URL. Проекты, окружения и правила замены путей.',
    permissions: ['storage', 'activeTab', 'contextMenus', 'clipboardWrite'],
    commands: {
      'switch-environment': {
        suggested_key: { default: 'Alt+Shift+L' },
        description: 'Открыть окружение по умолчанию',
      },
      'toggle-icon-action': {
        suggested_key: { default: 'Alt+Shift+P' },
        description:
          'Переключить действие иконки: попап ↔ окружение по умолчанию',
      },
    },
  },
});
