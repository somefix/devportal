import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
// import path from "path";
// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Devportal',
    version: '1.0',
    description:
      'Открой нужную страницу с прода на локалке одним кликом — без копипаста урлов!',
    permissions: ['storage', 'activeTab', 'contextMenus', 'clipboardWrite'],
    commands: {
      'switch-environment': {
        suggested_key: { default: 'Alt+Shift+L' },
        description: 'Открыть окружение по умолчанию',
      },
    },
    action: {
      default_title: 'Devportal',
    },
  },
});
