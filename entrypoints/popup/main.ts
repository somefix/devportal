import { createApp } from 'vue';
import { setupPrimeVue } from '@/shared/primevue';
import EnvironmentSwitcher from '@/shared/components/EnvironmentSwitcher.vue';
import '../options/style.css';
const app = createApp(EnvironmentSwitcher);
setupPrimeVue(app);
document.body.classList.add('popup');
app.mount('#app');
