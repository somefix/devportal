<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import Message from 'primevue/message';
import {
  type Environment,
  type Settings,
  addressUrl,
  detectProject,
  loadSettings,
  openEnvironment,
  transformUrl,
} from '@/shared/environments';
import { loadLanguage, formatError, t } from '@/shared/i18n';

const settings = ref<Settings>();
const projectId = ref('');
const selectedIndex = ref(0);
const source = ref('');
const tabId = ref<number>();
const newTab = ref(true);
const message = ref('');
const copied = ref(false);
const project = computed(() =>
  settings.value?.projects.find((item) => item.id === projectId.value),
);
const local = computed(() =>
  project.value?.environments.find(
    (item) => item.name.trim().toLowerCase() === 'local',
  ),
);
const current = computed(() =>
  project.value?.environments.find((item) => {
    try {
      return addressUrl(item.address).host === new URL(source.value).host;
    } catch {
      return false;
    }
  }),
);
const choices = computed(
  () =>
    project.value?.environments.filter(
      (item) => item.id !== current.value?.id,
    ) ?? [],
);
const rows = computed(() => [
  ...choices.value,
  ...(current.value ? [current.value] : []),
]);

function targetUrl(environment: Environment) {
  try {
    return project.value
      ? transformUrl(source.value, project.value, environment)
      : '';
  } catch {
    return '';
  }
}
function displayUrl(environment: Environment) {
  return (
    targetUrl(environment).replace(/^https?:\/\//, '') || environment.address
  );
}
function openOptions() {
  void browser.runtime.openOptionsPage();
}
async function copy(environment = local.value) {
  const url = environment && targetUrl(environment);
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
  } catch {
    message.value = t('copyError');
  }
}
async function open(environment: Environment) {
  try {
    if (!project.value || !targetUrl(environment)) return;
    await openEnvironment(
      source.value,
      project.value,
      environment,
      tabId.value,
      newTab.value,
    );
    window.close();
  } catch (error) {
    message.value = formatError(error);
  }
}
function handleKeydown(event: KeyboardEvent) {
  if (
    (event.target as HTMLElement)?.closest(
      'input, [role="combobox"], [role="listbox"], .p-select',
    )
  )
    return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const count = choices.value.length;
  if (!count) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex.value =
      (selectedIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) %
      count;
  } else if (
    event.key === 'Enter' &&
    (event.target as HTMLElement)?.tagName !== 'BUTTON'
  ) {
    event.preventDefault();
    const environment = choices.value[selectedIndex.value];
    if (environment) void open(environment);
  } else if (/^[1-9]$/.test(event.key)) {
    const environment = choices.value[Number(event.key) - 1];
    if (environment) {
      event.preventDefault();
      void open(environment);
    }
  }
}
watch(projectId, () => {
  selectedIndex.value = Math.max(
    0,
    choices.value.findIndex(
      (item) =>
        item.id === (local.value?.id ?? project.value?.defaultEnvironment),
    ),
  );
  newTab.value = project.value?.newTab ?? true;
  copied.value = false;
});
onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);
  try {
    await loadLanguage();
    settings.value = await loadSettings();
    const params = new URLSearchParams(location.search);
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    source.value = params.get('copy') ?? tab?.url ?? '';
    tabId.value = tab?.id;
    projectId.value =
      params.get('project') ??
      detectProject(settings.value, source.value)?.id ??
      settings.value.selectedProject;
    if (params.has('copy')) {
      const environment = project.value?.environments.find(
        (item) => item.id === params.get('environment'),
      );
      await copy(environment);
    }
  } catch (error) {
    message.value = formatError(error);
  }
});
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <section class="quick-card">
    <header class="quick-header">
      <div
        class="quick-brand"
        title="Devportal"
      >
        <i
          class="pi pi-window-maximize"
          aria-hidden="true"
        /><span>Devportal</span>
      </div>
      <Select
        v-model="projectId"
        :options="settings?.projects ?? []"
        option-label="name"
        option-value="id"
        :placeholder="t('chooseProject')"
        :aria-label="t('chooseProject')"
      />
      <Button
        icon="pi pi-cog"
        text
        :aria-label="t('openSettings')"
        @click="openOptions"
      />
    </header>
    <div class="environment-list">
      <Button
        v-for="(environment, index) in rows"
        :key="environment.id"
        class="environment-card"
        :class="{
          highlighted: choices[selectedIndex]?.id === environment.id,
          current: current?.id === environment.id,
        }"
        :disabled="current?.id === environment.id || !targetUrl(environment)"
        @click="open(environment)"
      >
        <i
          class="pi pi-external-link environment-icon"
          aria-hidden="true"
        />
        <span class="environment-details"
          ><strong>{{
            environment.id === local?.id
              ? `${t('openOn')} ${environment.name}`
              : environment.name
          }}</strong
          ><span>{{ displayUrl(environment) }}</span></span
        >
        <span
          v-if="current?.id === environment.id"
          class="current-badge"
          >{{ t('here') }}</span
        >
        <template v-else
          ><kbd v-if="index < 9">{{ index + 1 }}</kbd
          ><i
            class="pi pi-chevron-right"
            aria-hidden="true"
        /></template>
      </Button>
    </div>
    <Message
      v-if="!rows.length"
      severity="info"
      >{{ t('empty')
      }}<Button
        :label="t('openSettings')"
        text
        @click="openOptions"
    /></Message>
    <div class="quick-actions">
      <div class="check-line">
        <ToggleSwitch
          v-model="newTab"
          input-id="quick-new-tab"
        /><label for="quick-new-tab">{{ t('newTab') }}</label>
      </div>
      <Button
        :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
        :label="copied ? t('copied') : `${t('copy')} Local`"
        text
        :disabled="!local || !targetUrl(local)"
        @click="copy()"
      />
    </div>
    <footer class="quick-footer">
      Enter — {{ choices[selectedIndex]?.name ?? 'Local' }} ·
      {{ t('keyboard') }}
    </footer>
    <Message
      v-if="message"
      severity="error"
      >{{ message }}</Message
    >
  </section>
</template>
