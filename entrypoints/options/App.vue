<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Panel from 'primevue/panel';
import Fieldset from 'primevue/fieldset';
import Toolbar from 'primevue/toolbar';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { storage } from 'wxt/utils/storage';
import logo from '@/assets/icon.png';
import HistoryPanel from './components/HistoryPanel.vue';
import {
  changeLanguage,
  language,
  loadLanguage,
  formatError,
  t,
} from '@/shared/i18n';
import {
  type Settings,
  HISTORY_KEY,
  SETTINGS_KEY,
  saveSettings,
  sendBackgroundRequest,
  createProject,
  createSettingsSnapshot,
  isValidEnvironmentAddress,
  loadSettings,
  UPDATE_NOTICE_KEY,
  validateSettings,
  colors,
} from '@/shared/environments';

const settings = ref<Settings>({
  version: 1,
  projects: [],
  selectedProject: '',
});
const project = computed(() =>
  settings.value.projects.find(
    (item) => item.id === settings.value.selectedProject,
  ),
);

const confirmation = useConfirm();
const dialog = ref(false);
const dialogName = ref('');
const editing = ref(false);
const confirmDeleteProject = () => {
  const projectId = settings.value.selectedProject;
  confirmation.require({
    header: t('deleteProject'),
    message: t('confirmDelete'),
    icon: 'pi pi-exclamation-triangle',
    defaultFocus: 'reject',
    rejectProps: {
      label: t('cancel'),
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: { label: t('deleteProject'), severity: 'danger' },
    accept: () => {
      settings.value.projects = settings.value.projects.filter(
        (p) => p.id !== projectId,
      );
      if (settings.value.selectedProject === projectId)
        settings.value.selectedProject = settings.value.projects[0]?.id ?? '';
    },
  });
};

const openNameDialog = (edit: boolean) => {
  editing.value = edit;
  dialogName.value = edit ? (project.value?.name ?? '') : '';
  dialog.value = true;
};

const submitName = () => {
  const name = dialogName.value.trim();
  if (!name) return;

  if (editing.value && project.value) {
    project.value.name = name;
  } else {
    const newProject = createProject(name);
    newProject.newTab = globalNewTab.value;
    settings.value.projects.push(newProject);
    settings.value.selectedProject = newProject.id;
  }
  dialog.value = false;
};

const environmentFieldCells = {
  headerCell: 'pl-0 pr-2',
  bodyCell: 'pl-0 pr-2',
};

const removeEnvironment = (environmentId: string) => {
  const selectedProject = project.value;
  if (!selectedProject) return;

  selectedProject.environments = selectedProject.environments.filter(
    (environment) => environment.id !== environmentId,
  );
  if (selectedProject.defaultEnvironment === environmentId) {
    selectedProject.defaultEnvironment =
      selectedProject.environments[0]?.id ?? '';
  }
};

const addEnvironment = () => {
  const environments = project.value?.environments;
  if (!environments || environments.length >= 20) return;

  environments.push({
    id: crypto.randomUUID(),
    name: '',
    address: '',
    color: colors[environments.length % colors.length] ?? '#1769ff',
  });
};

const addRule = () => {
  project.value?.rules.push({ from: '', to: '' });
};

const removeRule = (index: number) => {
  project.value?.rules.splice(index, 1);
};

const languageOptions = [
  { label: 'Русский', value: 'ru' },
  { label: 'English', value: 'en' },
];

const globalNewTab = ref(true);
const openLinkOptions = computed(() => [
  { label: t('newTab'), value: true },
  { label: t('currentTab'), value: false },
]);
const shortcutDefinitions = [
  ['switch-environment', 'openDefaultEnvironment'],
  ['toggle-icon-action', 'toggleModeShortcut'],
] as const;
const commands = ref<{ name?: string; shortcut?: string }[]>();
const shortcuts = computed(() =>
  shortcutDefinitions.map(([name, label]) => ({
    name,
    label: t(label),
    key: commands.value?.find((command) => command.name === name)?.shortcut,
  })),
);

const iconActions = computed(() => [
  { label: t('popup'), value: 'popup' },
  { label: t('openDefaultEnvironment'), value: 'local' },
]);
const savedIconAction = ref<Settings['iconAction']>();
const iconActionDraft = ref<{
  value: Settings['iconAction'];
  imported?: boolean;
}>();
const iconAction = computed(() =>
  iconActionDraft.value ? iconActionDraft.value.value : savedIconAction.value,
);
const canConfigureShortcuts = !import.meta.env.FIREFOX;

const updateNewTab = (value: boolean) => {
  globalNewTab.value = value;
  settings.value.projects.forEach((project) => {
    project.newTab = value;
  });
};

const openShortcuts = () => {
  void browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
};

const setIconAction = (value: NonNullable<Settings['iconAction']>) => {
  iconActionDraft.value = { value, imported: iconActionDraft.value?.imported };
};

const status = ref('');
const error = ref('');
const saveError = ref('');
const ready = ref(false);
let shortcutRequest = 0;
const refreshShortcuts = async () => {
  const request = ++shortcutRequest;
  try {
    const browserCommands = await browser.commands.getAll();
    if (request === shortcutRequest) commands.value = browserCommands;
  } catch (e) {
    if (request === shortcutRequest) error.value = formatError(e);
  }
};
const snapshotOf = createSettingsSnapshot();
let lastSaved = '';
let saveQueue = Promise.resolve(true);
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const serializeDraft = (settings: Settings) => {
  return JSON.stringify({ ...settings, iconAction: undefined });
};

const flushSave = () => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  if (!ready.value) return saveQueue;

  const snapshot = snapshotOf(settings.value);
  const serialized = serializeDraft(snapshot);
  const actionDraft = iconActionDraft.value;
  saveQueue = saveQueue.then(async () => {
    try {
      const replaceIconAction =
        actionDraft !== undefined && actionDraft === iconActionDraft.value;
      if (replaceIconAction || serialized !== lastSaved) {
        await saveSettings(
          { ...snapshot, iconAction: actionDraft?.value },
          replaceIconAction,
        );
        lastSaved = serialized;
      }
      if (replaceIconAction && actionDraft === iconActionDraft.value) {
        iconActionDraft.value = undefined;
        if (actionDraft.imported) status.value = t('imported');
      }
      saveError.value = '';
      return true;
    } catch (e) {
      saveError.value = formatError(e);
      return false;
    }
  });
  return saveQueue;
};
const savePendingChanges = () => {
  if (saveTimer !== undefined || saveError.value) void flushSave();
};

const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden') savePendingChanges();
  else if (document.visibilityState === 'visible') void refreshShortcuts();
};
const history = ref<string[]>([]);
const clearingHistory = ref(false);
let stopWatchingHistory: (() => void) | undefined;
let stopWatchingIconAction: (() => void) | undefined;

const openHistory = async (source: string) => {
  error.value = '';
  try {
    await sendBackgroundRequest({
      type: 'devportal:open-history-source',
      source,
    });
  } catch (e) {
    error.value = formatError(e);
  }
};

const clearHistory = async () => {
  clearingHistory.value = true;
  error.value = '';
  status.value = '';
  try {
    await sendBackgroundRequest({ type: 'devportal:clear-history' });
  } catch (e) {
    error.value = formatError(e);
  } finally {
    clearingHistory.value = false;
  }
};

const file = ref<HTMLInputElement>();

const importFile = async (event: Event) => {
  try {
    const selectedFile = (event.target as HTMLInputElement).files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 1_000_000) throw new Error(t('largeFile'));

    const data = validateSettings(JSON.parse(await selectedFile.text()));
    settings.value = data;
    snapshotOf(settings.value, true);
    globalNewTab.value = project.value?.newTab ?? true;
    ready.value = true;
    error.value = '';
    status.value = '';
    iconActionDraft.value = { value: data.iconAction, imported: true };
  } catch (e) {
    error.value = formatError(e);
  } finally {
    if (file.value) file.value.value = '';
  }
};

const exportFile = () => {
  const snapshot = {
    ...snapshotOf(settings.value),
    iconAction: iconAction.value,
  };
  const json = JSON.stringify(snapshot, null, 2);
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  );
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'devportal.json';
  downloadLink.click();
  URL.revokeObjectURL(url);
};

watch(
  [settings, iconActionDraft],
  ([, draft], [, previousDraft]) => {
    if (!draft && previousDraft) return;
    clearTimeout(saveTimer);
    if (ready.value) saveTimer = setTimeout(flushSave, 400);
  },
  { deep: true, flush: 'sync' },
);

onMounted(async () => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', refreshShortcuts);
  window.addEventListener('pagehide', savePendingChanges);
  void refreshShortcuts();
  let iconActionChanged = false;
  stopWatchingIconAction = storage.watch<Settings>(SETTINGS_KEY, (saved) => {
    iconActionChanged = true;
    savedIconAction.value = saved?.iconAction;
  });
  let historyChanged = false;
  stopWatchingHistory = storage.watch<string[]>(HISTORY_KEY, (urls) => {
    historyChanged = true;
    history.value = urls ?? [];
  });
  try {
    await loadLanguage();
    const loaded = await loadSettings();
    if (!ready.value) {
      settings.value = loaded;
      snapshotOf(settings.value, true);
      lastSaved = serializeDraft(loaded);
      if (!iconActionChanged) savedIconAction.value = loaded.iconAction;
      globalNewTab.value = project.value?.newTab ?? true;
      ready.value = true;
    }
    const urls = await storage.getItem<string[]>(HISTORY_KEY);
    if (!historyChanged) history.value = urls ?? [];
    await storage.removeItem(UPDATE_NOTICE_KEY);
  } catch (e) {
    error.value = formatError(e);
  }
});
onUnmounted(() => {
  clearTimeout(saveTimer);
  shortcutRequest++;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('focus', refreshShortcuts);
  window.removeEventListener('pagehide', savePendingChanges);
  stopWatchingHistory?.();
  stopWatchingIconAction?.();
});
</script>

<template>
  <Toolbar
    class="gap-3 rounded-none border-x-0 border-t-0 px-4 py-4 sm:px-6"
    :pt="{ end: { class: 'w-full min-w-0 lg:w-auto' } }"
    aria-label="Devportal"
  >
    <template #start>
      <div class="flex items-center gap-3">
        <span
          class="block size-8 shrink-0 bg-[var(--p-primary-color)]"
          :style="{ mask: `url(${logo}) center / contain no-repeat` }"
          aria-hidden="true"
        />
        <h1 class="text-2xl font-semibold text-[var(--p-primary-color)]">
          Devportal
        </h1>
      </div>
    </template>
    <template #end>
      <div class="flex flex-wrap items-center gap-2.5">
        <Select
          :model-value="language"
          :options="languageOptions"
          option-label="label"
          option-value="value"
          aria-label="Язык / Language"
          @update:model-value="changeLanguage"
        />
        <Button
          :label="t('import')"
          icon="pi pi-upload"
          outlined
          @click="file?.click()"
        />
        <Button
          :label="t('export')"
          icon="pi pi-download"
          outlined
          :disabled="!ready"
          @click="exportFile"
        />
        <Button
          :label="t('addProject')"
          icon="pi pi-plus"
          :disabled="!ready || settings.projects.length >= 30"
          @click="openNameDialog(false)"
        />
      </div>
    </template>
  </Toolbar>
  <main class="mx-auto max-w-7xl px-3 pb-6 lg:px-5">
    <ConfirmDialog class="m-4 max-w-full" />
    <Tabs
      v-if="project"
      v-model:value="settings.selectedProject"
      scrollable
    >
      <TabList
        class="mb-4"
        :pt="{ tabList: { 'aria-label': t('chooseProject') } }"
      >
        <Tab
          v-for="item in settings.projects"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </Tab>
      </TabList>
      <TabPanels class="bg-transparent p-0">
        <TabPanel :value="settings.selectedProject">
          <Panel
            class="mb-3.5 min-w-0"
            :pt="{ contentWrapper: { class: 'min-w-0' } }"
          >
            <template #header="{ id }">
              <div class="flex w-full items-center gap-3">
                <h2
                  :id="id"
                  class="min-w-0 text-2xl font-semibold wrap-anywhere"
                >
                  {{ project.name }}
                </h2>
                <div class="ml-auto flex items-center gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    :aria-label="t('rename')"
                    @click="openNameDialog(true)"
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    :aria-label="t('deleteProject')"
                    @click="confirmDeleteProject"
                  />
                </div>
              </div>
            </template>
            <h3 class="mb-4 text-lg font-semibold">{{ t('environments') }}</h3>
            <DataTable
              :value="project.environments"
              data-key="id"
              :pt="{
                tableContainer: { class: 'overflow-x-auto' },
                table: { class: 'min-w-md' },
              }"
              scrollable
            >
              <Column
                :header="t('name')"
                :pt="environmentFieldCells"
                class="w-2/5"
              >
                <template #body="{ data }">
                  <InputText
                    v-model="data.name"
                    :aria-label="t('name')"
                    :placeholder="t('name')"
                    class="w-full min-w-24"
                    maxlength="100"
                  />
                </template>
              </Column>
              <Column
                :header="t('address')"
                :pt="environmentFieldCells"
              >
                <template #body="{ data }">
                  <InputText
                    v-model="data.address"
                    :aria-label="`${t('address')} ${data.name}`"
                    :invalid="
                      !!data.address.trim() &&
                      !isValidEnvironmentAddress(data.address)
                    "
                    placeholder="https://example.com"
                    class="w-full"
                  />
                </template>
              </Column>
              <Column
                class="w-12"
                :pt="{ headerCell: 'px-0', bodyCell: 'px-0' }"
              >
                <template #body="{ data }">
                  <div class="flex items-center gap-1">
                    <Button
                      :icon="
                        project.defaultEnvironment === data.id
                          ? 'pi pi-star-fill'
                          : 'pi pi-star'
                      "
                      text
                      :aria-label="`${t('setDefaultEnvironment')} ${data.name}`"
                      :aria-pressed="project.defaultEnvironment === data.id"
                      :disabled="
                        !data.name.trim() ||
                        !isValidEnvironmentAddress(data.address)
                      "
                      @click="project.defaultEnvironment = data.id"
                    />
                    <Button
                      icon="pi pi-trash"
                      text
                      :aria-label="`${t('deleteEnvironment')} ${data.name}`"
                      @click="removeEnvironment(data.id)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <Button
              class="mt-3"
              :label="t('addEnvironment')"
              icon="pi pi-plus"
              outlined
              :disabled="project.environments.length >= 20"
              @click="addEnvironment"
            />
          </Panel>
        </TabPanel>
      </TabPanels>
    </Tabs>
    <Message
      v-else-if="ready"
      class="my-4"
      severity="info"
      >{{ t('empty') }}</Message
    >
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <Panel
        v-if="project"
        class="min-w-0"
      >
        <template #header="{ id }">
          <h2
            :id="id"
            class="text-xl font-semibold"
          >
            {{ t('rules') }}
          </h2>
        </template>
        <div class="mb-4 flex items-center gap-2">
          <Checkbox
            v-model="project.preserveSuffix"
            input-id="preserve"
            binary
          />
          <label for="preserve">{{ t('preserve') }}</label>
        </div>
        <div
          v-for="(rule, index) in project.rules"
          :key="index"
          class="mb-2 flex items-center gap-2"
        >
          <InputText
            v-model="rule.from"
            :placeholder="t('from')"
            :aria-label="t('from')"
            class="min-w-0 flex-1"
          />
          <InputText
            v-model="rule.to"
            :placeholder="t('to')"
            :aria-label="t('to')"
            class="min-w-0 flex-1"
          />
          <Button
            icon="pi pi-trash"
            text
            :aria-label="t('deleteRule')"
            @click="removeRule(index)"
          />
        </div>
        <Button
          :label="t('addRule')"
          icon="pi pi-plus"
          outlined
          @click="addRule"
        />
      </Panel>
      <Panel
        v-if="ready"
        class="min-w-0"
      >
        <template #header="{ id }">
          <h2
            :id="id"
            class="text-xl font-semibold"
          >
            {{ t('general') }}
          </h2>
        </template>
        <p class="mb-4 text-sm text-slate-600">{{ t('allProjects') }}</p>
        <Fieldset
          class="min-w-0"
          :legend="t('openLinks')"
        >
          <SelectButton
            :model-value="globalNewTab"
            :options="openLinkOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :pt="{ root: { 'aria-label': t('openLinks') } }"
            @update:model-value="updateNewTab"
          />
        </Fieldset>
        <Fieldset
          class="mt-3 min-w-0"
          :legend="t('iconAction')"
        >
          <SelectButton
            :model-value="iconAction ?? 'popup'"
            :options="iconActions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :pt="{ root: { 'aria-label': t('iconAction') } }"
            @update:model-value="setIconAction"
          />
        </Fieldset>
        <Fieldset
          class="mt-3 min-w-0"
          :legend="t('shortcut')"
        >
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.name"
            class="mb-2 flex flex-wrap items-center gap-2"
          >
            <span>{{ shortcut.label }}</span>
            <Tag
              v-if="commands"
              severity="secondary"
            >
              <kbd v-if="shortcut.key">{{ shortcut.key }}</kbd>
              <span v-else>{{ t('noShortcut') }}</span>
            </Tag>
          </div>
          <Button
            v-if="canConfigureShortcuts"
            :label="t('configure')"
            link
            @click="openShortcuts"
          />
        </Fieldset>
      </Panel>
    </div>
    <div
      v-if="error || saveError || status"
      class="my-4 space-y-2"
    >
      <Message
        v-if="saveError"
        severity="error"
        >{{ t('saveError') }} {{ saveError }}</Message
      >
      <Message
        v-if="error"
        severity="error"
        closable
        @close="error = ''"
        >{{ error }}</Message
      >
      <Message
        v-if="status"
        severity="success"
        closable
        @close="status = ''"
        >{{ status }}</Message
      >
    </div>
    <HistoryPanel
      v-if="settings.projects.length"
      class="mt-4"
      :history="history"
      :clearing="clearingHistory"
      @open="openHistory"
      @clear="clearHistory"
    />
    <input
      ref="file"
      type="file"
      accept="application/json,.json"
      hidden
      @change="importFile"
    />
    <Dialog
      v-model:visible="dialog"
      modal
      :header="editing ? t('projectName') : t('addProject')"
      class="m-4 w-104 max-w-full"
    >
      <form @submit.prevent="submitName">
        <InputText
          v-model="dialogName"
          autofocus
          :placeholder="t('exampleName')"
          :aria-label="t('projectName')"
          class="min-w-0 w-full"
          maxlength="100"
        />
        <div class="mt-5 flex justify-end gap-2.5">
          <Button
            :label="t('cancel')"
            text
            @click="dialog = false"
          />
          <Button
            type="submit"
            :label="t('done')"
            :disabled="!dialogName.trim()"
          />
        </div>
      </form>
    </Dialog>
  </main>
</template>
