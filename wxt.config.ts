import { defineConfig } from 'wxt';
import tailwindcss from "@tailwindcss/vite";
// import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    "manifest_version": 3,
    "name": "Devportal",
    "version": "1.0",
    "description": "Открывает заданный URL в новой вкладке.",
    "permissions": [
      "storage",
      "activeTab"
    ],
    action: {
      default_title: 'Some Title',
    },
  }
});
