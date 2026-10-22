<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Menu from 'primevue/menu';
import { storage } from 'wxt/utils/storage';
import {
  changeLanguage,
  language,
  loadLanguage,
  formatError,
  t,
} from '@/shared/i18n';
import {
  type Settings,
  type Environment,
  saveSettings,
  createProject,
  loadSettings,
  transformUrl,
  validateSettings,
  colors,
} from '@/shared/environments';
const settings = ref<Settings>({
  version: 1,
  projects: [],
  selectedProject: '',
});
const project = computed(() =>
  settings.value.projects.find((p) => p.id === settings.value.selectedProject),
);
const showHistory = ref(false);
const globalNewTab = ref(true);
function updateNewTab(value: boolean) {
  globalNewTab.value = value;
  settings.value.projects.forEach((project) => {
    project.newTab = value;
  });
}
function openShortcuts() {
  void browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
}
const status = ref('');
const error = ref('');
const ready = ref(false);
const source = ref('https://example.com/app/tasks/123?tab=history');
const history = ref<string[]>([]);
const result = computed(() => {
  try {
    const p = project.value;
    const env =
      p?.environments.find((e) => e.id === p.defaultEnvironment) ??
      p?.environments[0];
    return p && env ? transformUrl(source.value, p, env) : '';
  } catch {
    return '';
  }
});
const dialog = ref(false);
const dialogName = ref('');
const editing = ref(false);
const file = ref<HTMLInputElement>();
const rowMenu = ref();
const row = ref<Environment>();
const projectMenu = ref();
const rowItems = computed(() => [
  {
    label: t('default'),
    icon: 'pi pi-star',
    command: () => {
      if (project.value && row.value)
        project.value.defaultEnvironment = row.value.id;
    },
  },
  {
    label: t('deleteEnvironment'),
    icon: 'pi pi-trash',
    command: () => {
      const p = project.value;
      if (!p || !row.value) return;
      p.environments = p.environments.filter((e) => e.id !== row.value!.id);
      if (p.defaultEnvironment === row.value.id)
        p.defaultEnvironment = p.environments[0]?.id ?? '';
    },
  },
]);
const projectItems = computed(() => [
  { label: t('rename'), icon: 'pi pi-pencil', command: () => nameDialog(true) },
  {
    label: t('deleteProject'),
    icon: 'pi pi-trash',
    command: () => {
      if (!confirm(t('confirmDelete'))) return;
      settings.value.projects = settings.value.projects.filter(
        (p) => p.id !== settings.value.selectedProject,
      );
      settings.value.selectedProject = settings.value.projects[0]?.id ?? '';
    },
  },
]);
function nameDialog(edit: boolean) {
  editing.value = edit;
  dialogName.value = edit ? (project.value?.name ?? '') : '';
  dialog.value = true;
}
function submitName() {
  if (!dialogName.value.trim()) return;
  if (editing.value && project.value)
    project.value.name = dialogName.value.trim();
  else {
    const p = createProject(dialogName.value.trim());
    p.newTab = globalNewTab.value;
    p.defaultEnvironment = p.environments[0]?.id ?? '';
    settings.value.projects.push(p);
    settings.value.selectedProject = p.id;
  }
  dialog.value = false;
}
function addEnvironment() {
  if (!project.value || project.value.environments.length >= 20) return;
  project.value.environments.push({
    id: crypto.randomUUID(),
    name: t('newEnvironment'),
    address: '',
    color:
      colors[project.value.environments.length % colors.length] ?? '#1769ff',
  });
}
async function save() {
  error.value = '';
  status.value = '';
  try {
    updateNewTab(globalNewTab.value);
    await saveSettings(settings.value);
    status.value = t('saved');
  } catch (e) {
    error.value = formatError(e);
  }
}
async function copy() {
  try {
    await navigator.clipboard.writeText(result.value);
    status.value = t('copied');
  } catch {
    error.value = t('copyError');
  }
}
async function importFile(event: Event) {
  try {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (f.size > 1000000) throw new Error(t('largeFile'));
    const data = validateSettings(JSON.parse(await f.text()));
    settings.value = data;
    globalNewTab.value = project.value?.newTab ?? true;
    ready.value = true;
    status.value = t('imported');
    error.value = '';
  } catch (e) {
    error.value = formatError(e);
  } finally {
    if (file.value) file.value.value = '';
  }
}
function exportFile() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(settings.value, null, 2)], {
      type: 'application/json',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'devportal.json';
  a.click();
  URL.revokeObjectURL(url);
}
onMounted(async () => {
  try {
    await loadLanguage();
    settings.value = await loadSettings();
    globalNewTab.value = project.value?.newTab ?? true;
    history.value = (await storage.getItem<string[]>('sync:history')) ?? [];
    ready.value = true;
  } catch (e) {
    error.value = formatError(e);
  }
});
</script>
<template>
  <header class="app-header">
    <div class="brand">
      <i
        class="pi pi-arrow-up-right"
        aria-hidden="true"
      />
      <h1>Devportal</h1>
    </div>
    <div class="header-actions">
      <Select
        :model-value="language"
        :options="[
          { label: 'Русский', value: 'ru' },
          { label: 'English', value: 'en' },
        ]"
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
        @click="nameDialog(false)"
      />
    </div>
  </header>
  <main class="workspace">
    <nav
      class="project-tabs"
      :aria-label="t('chooseProject')"
    >
      <Button
        v-for="item in settings.projects"
        :key="item.id"
        :label="item.name"
        text
        :class="{ selected: item.id === settings.selectedProject }"
        @click="settings.selectedProject = item.id"
      />
      <Button
        icon="pi pi-ellipsis-h"
        text
        :aria-label="t('actions')"
        :disabled="!project"
        @click="projectMenu?.toggle($event)"
      />
      <Menu
        ref="projectMenu"
        :model="projectItems"
        popup
      />
      <Button
        class="history-button"
        icon="pi pi-history"
        text
        :aria-label="t('history')"
        @click="showHistory = !showHistory"
      />
    </nav>
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
    <Message
      v-if="ready && !project"
      severity="info"
      >{{ t('empty') }}</Message
    >
    <template v-if="project">
      <section class="panel environment-panel">
        <div class="panel-heading">
          <h2>{{ project.name }}</h2>
          <Button
            icon="pi pi-pencil"
            text
            :aria-label="t('rename')"
            @click="nameDialog(true)"
          />
          <Button
            class="project-actions"
            icon="pi pi-ellipsis-h"
            text
            :aria-label="t('actions')"
            @click="projectMenu?.toggle($event)"
          />
        </div>
        <h3>{{ t('environments') }}</h3>
        <DataTable
          :value="project.environments"
          data-key="id"
          table-style="min-width: 600px"
        >
          <Column
            :header="t('name')"
            style="width: 42%"
          >
            <template #body="{ data }">
              <div class="environment-name">
                <span
                  class="dot"
                  :style="{ background: data.color }"
                /><InputText
                  v-model="data.name"
                  :aria-label="t('name')"
                  class="inline-input name-input"
                  maxlength="100"
                />
              </div>
            </template>
          </Column>
          <Column :header="t('address')">
            <template #body="{ data }">
              <div class="address-cell">
                <InputText
                  v-model="data.address"
                  :aria-label="`${t('address')} ${data.name}`"
                  placeholder="https://example.com"
                  class="inline-input address-input"
                /><span
                  v-if="project.defaultEnvironment === data.id"
                  class="badge"
                  >{{ t('default') }}</span
                >
              </div>
            </template>
          </Column>
          <Column style="width: 48px">
            <template #body="{ data }"
              ><Button
                icon="pi pi-ellipsis-v"
                text
                :aria-label="`${t('actions')} ${data.name}`"
                @click="
                  row = data;
                  rowMenu?.toggle($event);
                "
            /></template>
          </Column>
        </DataTable>
        <Menu
          ref="rowMenu"
          :model="rowItems"
          popup
        />
        <Button
          class="add-environment"
          :label="t('addEnvironment')"
          icon="pi pi-plus"
          outlined
          :disabled="project.environments.length >= 20"
          @click="addEnvironment"
        />
      </section>
      <div class="cards-grid">
        <section class="panel">
          <h3>{{ t('rules') }}</h3>
          <label
            class="field-label"
            for="prefix"
            >{{ t('prefix') }}</label
          >
          <InputText
            id="prefix"
            v-model="project.stripPrefix"
            placeholder="/app"
            class="full"
          />
          <div class="check-line">
            <Checkbox
              v-model="project.preserveSuffix"
              input-id="preserve"
              binary
            /><label for="preserve">{{ t('preserve') }}</label>
          </div>
          <details class="advanced-rules">
            <summary>{{ t('addRule') }}</summary>
            <div
              v-for="(rule, index) in project.rules"
              :key="index"
              class="rule-row"
            >
              <InputText
                v-model="rule.from"
                :placeholder="t('from')"
                :aria-label="t('from')"
              />
              <InputText
                v-model="rule.to"
                :placeholder="t('to')"
                :aria-label="t('to')"
              />
              <Button
                icon="pi pi-trash"
                text
                :aria-label="t('deleteRule')"
                @click="project.rules.splice(index, 1)"
              />
            </div>
            <Button
              :label="t('addRule')"
              text
              @click="project.rules.push({ from: '', to: '' })"
            />
          </details>
        </section>
        <section class="panel link-test">
          <h3>{{ t('test') }}</h3>
          <label
            class="field-label"
            for="source"
            >{{ t('source') }}</label
          >
          <InputText
            id="source"
            v-model="source"
            class="full"
          />
          <label
            class="field-label result-label"
            for="result"
            >{{ t('result') }}
            {{
              project.environments.find(
                (e) => e.id === project?.defaultEnvironment,
              )?.name
            }}</label
          >
          <div class="result-row">
            <InputText
              id="result"
              :model-value="result"
              :placeholder="t('invalid')"
              readonly
              class="full result-input"
            /><Button
              icon="pi pi-copy"
              outlined
              :aria-label="t('copy')"
              :disabled="!result"
              @click="copy"
            />
          </div>
        </section>
      </div>
      <section class="panel general-panel">
        <h3>{{ t('general') }}</h3>
        <p class="muted">{{ t('allProjects') }}</p>
        <div class="general-grid">
          <div>
            <h4>{{ t('openLinks') }}</h4>
            <div class="radio-options">
              <div class="check-line">
                <RadioButton
                  :model-value="globalNewTab"
                  :value="true"
                  name="open-links"
                  input-id="new-tab"
                  @update:model-value="updateNewTab"
                /><label for="new-tab">{{ t('newTab') }}</label>
              </div>
              <div class="check-line">
                <RadioButton
                  :model-value="globalNewTab"
                  :value="false"
                  name="open-links"
                  input-id="current-tab"
                  @update:model-value="updateNewTab"
                /><label for="current-tab">{{ t('currentTab') }}</label>
              </div>
            </div>
          </div>
          <div class="shortcut-settings">
            <h4>{{ t('shortcut') }}</h4>
            <div class="shortcut-keys">
              <kbd>Alt</kbd><span>+</span><kbd>Shift</kbd><span>+</span
              ><kbd>L</kbd
              ><Button
                :label="t('configure')"
                link
                @click="openShortcuts"
              />
            </div>
          </div>
        </div>
        <details class="advanced-rules">
          <summary>{{ t('iconAction') }}</summary>
          <SelectButton
            v-model="settings.iconAction"
            :options="[
              { label: t('popup'), value: 'popup' },
              { label: t('local'), value: 'local' },
            ]"
            option-label="label"
            option-value="value"
            :allow-empty="false"
          />
        </details>
      </section>
    </template>
    <section
      v-if="showHistory"
      class="panel"
    >
      <h3>{{ t('history') }}</h3>
      <p
        v-if="!history.length"
        class="muted"
      >
        {{ t('emptyHistory') }}
      </p>
      <p
        v-for="url in history"
        :key="url"
        class="history-url"
      >
        {{ url }}
      </p>
      <Button
        v-if="history.length"
        :label="t('clearHistory')"
        outlined
        @click="
          storage.setItem('sync:history', []);
          history = [];
        "
      />
    </section>
    <footer class="actions">
      <Button
        :label="t('save')"
        :disabled="!ready"
        @click="save"
      />
    </footer>
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
      :style="{ width: '26rem' }"
    >
      <form @submit.prevent="submitName">
        <InputText
          v-model="dialogName"
          autofocus
          :placeholder="t('exampleName')"
          :aria-label="t('projectName')"
          class="full"
          maxlength="100"
        />
        <div class="dialog-actions">
          <Button
            :label="t('cancel')"
            text
            @click="dialog = false"
          /><Button
            type="submit"
            :label="t('done')"
            :disabled="!dialogName.trim()"
          />
        </div>
      </form>
    </Dialog>
  </main>
</template>
