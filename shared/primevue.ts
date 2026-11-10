import type { App } from 'vue';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';

const preset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{sky.50}',
      100: '{sky.100}',
      200: '{sky.200}',
      300: '{sky.300}',
      400: '{sky.400}',
      500: '{sky.500}',
      600: '{sky.600}',
      700: '{sky.700}',
      800: '{sky.800}',
      900: '{sky.900}',
      950: '{sky.950}',
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
