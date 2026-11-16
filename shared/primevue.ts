import type { App } from 'vue';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';

const preset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#EAF0F7',
      100: '#DCE5F0',
      200: '#BFCEE1',
      300: '#9EB2CE',
      400: '#7F98BC',
      500: '#6983A8',
      600: '#5B7397',
      700: '#4F6588',
      800: '#435674',
      900: '#374760',
      950: '#252F40',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
      },
    },
  },
});

export const setupPrimeVue = (app: App) => {
  app.use(ConfirmationService);
  app.use(PrimeVue, {
    theme: {
      preset,
      options: {
        darkModeSelector: false,
        cssLayer: {
          name: 'primevue',
          order: 'theme, base, primevue, components, utilities',
        },
      },
    },
  });
};
