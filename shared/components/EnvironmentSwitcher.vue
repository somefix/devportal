<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import ToggleSwitch from 'primevue/toggleswitch';
import vTooltip from 'primevue/tooltip';
import { storage } from 'wxt/utils/storage';
import Message from 'primevue/message';
import DataView from 'primevue/dataview';
import Toolbar from 'primevue/toolbar';
import logo from '@/assets/icon.png';
import Tag from 'primevue/tag';
import {
  type Environment,
  type Settings,
  SETTINGS_KEY,
  toggleIconAction,
  detectProject,
  loadSettings,
  sendBackgroundRequest,
  transformUrl,
} from '@/shared/environments';
import { loadLanguage, formatError, t } from '@/shared/i18n';

const settings = ref<Settings>();
const projectId = ref('');
const selectedIndex = ref(0);
const source = ref('');
const tabId = ref<number>();
const message = ref('');
const copied = ref(false);
const loaded = ref(false);
const savingIconAction = ref(false);
const commands = ref<{ name?: string; shortcut?: string }[]>([]);
const shortcuts = computed(() =>
  [
    {
      name: 'switch-environment',
      label: t('openDefaultEnvironment'),
      shortLabel: t('openEnvironmentShortcut'),
      icon: 'pi pi-external-link',
    },
    {
      name: 'toggle-icon-action',
      label: t('toggleModeShortcut'),
      shortLabel: t('switchModeShortcut'),
      icon: 'pi pi-sync',
    },
  ].map((shortcut) => ({
    ...shortcut,
    key: commands.value.find((command) => command.name === shortcut.name)
      ?.shortcut,
  })),
);
const popupEnabled = computed(() => settings.value?.iconAction !== 'local');
const changeIconAction = async () => {
  if (savingIconAction.value) return;
  savingIconAction.value = true;
  try {
    await toggleIconAction();
    const saved = await loadSettings();
    if (settings.value) settings.value.iconAction = saved.iconAction;
  } catch (error) {
    message.value = formatError(error);
  } finally {
    savingIconAction.value = false;
  }
};
let stopWatchingSettings: (() => void) | undefined;
const isWebPage = computed(() => /^https?:\/\//i.test(source.value));
const project = computed(() =>
  settings.value?.projects.find((item) => item.id === projectId.value),
);
const local = computed(() =>
  project.value?.environments.find(
    (item) => item.name.trim().toLowerCase() === 'local',
  ),
);
const targetUrl = (environment: Environment, reopenCurrent = false) => {
  try {
    return project.value
      ? transformUrl(source.value, project.value, environment, reopenCurrent)
      : '';
  } catch {
    return '';
  }
};

const choices = computed(() =>
  (project.value?.environments ?? []).flatMap((environment) => {
    const url = targetUrl(environment, true);
    return url ? [{ environment, url }] : [];
  }),
);
const localCopyUrl = computed(() => local.value && targetUrl(local.value));

const openOptions = () => {
  void browser.runtime.openOptionsPage();
};
const copy = async (environment = local.value) => {
  const url = environment && targetUrl(environment);
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
  } catch {
    message.value = t('copyError');
  }
};
const open = async (environment: Environment) => {
  try {
    if (!project.value || !targetUrl(environment, true)) return;
    await sendBackgroundRequest({
      type: 'devportal:open-environment',
      source: source.value,
      projectId: project.value.id,
      environmentId: environment.id,
      tabId: tabId.value,
      newTab: project.value.newTab,
      reopenCurrent: true,
    });
    window.close();
  } catch (error) {
    message.value = formatError(error);
  }
};
const handleKeydown = (event: KeyboardEvent) => {
  if (
    (event.target as HTMLElement)?.closest(
      'input, [role="combobox"], [role="listbox"], [role="tablist"], [role="switch"]',
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
    const environment = choices.value[selectedIndex.value]?.environment;
    if (environment) void open(environment);
  } else if (/^[1-9]$/.test(event.key)) {
    const environment = choices.value[Number(event.key) - 1]?.environment;
    if (environment) {
      event.preventDefault();
      void open(environment);
    }
  }
};
watch(projectId, () => {
  selectedIndex.value = Math.max(
    0,
    choices.value.findIndex(
      ({ environment }) =>
        environment.id ===
        (local.value?.id ?? project.value?.defaultEnvironment),
    ),
  );
  copied.value = false;
});
onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);
  try {
    await loadLanguage();
    settings.value = await loadSettings();
    stopWatchingSettings = storage.watch<Settings>(SETTINGS_KEY, (saved) => {
      if (settings.value && saved) settings.value.iconAction = saved.iconAction;
    });
    void browser.commands
      .getAll()
      .then((items) => {
        commands.value = items;
      })
      .catch((error) => {
        message.value = formatError(error);
      });
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
  } finally {
    loaded.value = true;
  }
});
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  stopWatchingSettings?.();
});
</script>

<template>
  <main class="space-y-3 p-3">
    <Toolbar
      class="gap-2 border-0 bg-transparent px-3 py-2"
      aria-label="Devportal"
    >
      <template #start>
        <div class="flex items-center gap-2">
          <span
            class="block size-6 shrink-0 bg-[var(--p-primary-color)]"
            :style="{ mask: `url(${logo}) center / contain no-repeat` }"
            aria-hidden="true"
          />
          <h1 class="text-lg font-semibold text-[var(--p-primary-color)]">
            Devportal
          </h1>
        </div>
      </template>
      <template #end>
        <Button
          icon="pi pi-cog"
          severity="secondary"
          text
          rounded
          :aria-label="t('openSettings')"
          @click="openOptions"
        />
      </template>
    </Toolbar>
    <template v-if="loaded">
      <Message
        v-if="message"
        severity="error"
        >{{ message }}</Message
      >
      <Tabs
        v-if="settings"
        v-model:value="projectId"
        scrollable
      >
        <TabList :pt="{ tabList: { 'aria-label': t('chooseProject') } }">
          <Tab
            v-for="item in settings.projects"
            :key="item.id"
            :value="item.id"
            class="px-3 py-2 text-sm"
          >
            {{ item.name }}
          </Tab>
        </TabList>
        <TabPanels class="bg-transparent px-0 pb-0 pt-3">
          <TabPanel :value="projectId">
            <Message
              v-if="!isWebPage && project"
              severity="info"
              >{{ t('noWebPage') }}</Message
            >
            <DataView
              v-else-if="settings"
              :value="choices"
              data-key="environment.id"
            >
              <template #list="{ items }">
                <div class="space-y-2">
                  <Button
                    v-for="({ environment, url }, index) in items"
                    :key="environment.id"
                    class="w-full justify-start text-left"
                    :outlined="selectedIndex !== index"
                    :severity="
                      selectedIndex === index ? 'primary' : 'secondary'
                    "
                    @click="open(environment)"
                  >
                    <i
                      class="pi pi-external-link shrink-0"
                      aria-hidden="true"
                    />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-semibold">{{
                        environment.name
                      }}</span>
                      <span
                        class="block truncate text-xs font-normal"
                        :title="url"
                        >{{ url }}</span
                      >
                    </span>
                    <Tag
                      v-if="url === source"
                      :value="t('here')"
                      severity="secondary"
                      class="shrink-0"
                    />
                    <Tag
                      v-if="index < 9"
                      severity="contrast"
                      aria-hidden="true"
                      ><kbd>{{ index + 1 }}</kbd></Tag
                    >
                  </Button>
                </div>
              </template>
              <template #empty>
                <Message severity="info">{{ t('empty') }}</Message>
              </template>
            </DataView>
          </TabPanel>
        </TabPanels>
      </Tabs>
      <Toolbar
        v-if="localCopyUrl"
        class="justify-end p-2"
        :pt="{ center: { class: 'hidden' } }"
        :aria-label="t('actions')"
      >
        <template #end>
          <Button
            :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
            :label="copied ? t('copied') : t('copyLocal')"
            size="small"
            severity="secondary"
            text
            @click="copy()"
          />
        </template>
      </Toolbar>
      <footer
        v-if="settings"
        class="space-y-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-600"
      >
        <label
          v-tooltip.top="t('popupModeHint')"
          class="flex cursor-pointer items-center justify-between gap-3"
          for="popup-mode"
        >
          <span>{{ t('popup') }}</span>
          <ToggleSwitch
            input-id="popup-mode"
            :model-value="popupEnabled"
            :disabled="savingIconAction"
            :aria-label="t('popupModeHint')"
            class="shrink-0"
            @update:model-value="changeIconAction"
          />
        </label>
        <span
          v-for="shortcut in shortcuts"
          :key="shortcut.name"
          v-tooltip.top="
            `${shortcut.label}: ${shortcut.key || t('noShortcut')}`
          "
          tabindex="0"
          :aria-label="`${shortcut.label}: ${shortcut.key || t('noShortcut')}`"
          class="flex items-center justify-between gap-3"
        >
          <span class="flex min-w-0 items-center gap-2">
            <i
              :class="shortcut.icon"
              aria-hidden="true"
            />
            <span>{{ shortcut.shortLabel }}</span>
          </span>
          <kbd
            class="shrink-0 whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium text-slate-800"
            >{{ shortcut.key || t('noShortcut') }}</kbd
          >
        </span>
      </footer>
      <p
        v-if="choices.length"
        class="text-center text-xs text-slate-600"
      >
        {{ t('keyboard') }}
      </p>
    </template>
  </main>
</template>
