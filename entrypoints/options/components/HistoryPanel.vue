<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Panel from 'primevue/panel';
import Menu from 'primevue/menu';
import type { Project } from '@/shared/environments';
import { t } from '@/shared/i18n';

const props = defineProps<{
  history: string[];
  clearing: boolean;
  project?: Project;
}>();

const emit = defineEmits<{
  clear: [];
  open: [source: string];
  openEnvironment: [source: string, environmentId: string];
}>();

const historyRows = computed(() =>
  [...new Set(props.history)].map((url) => ({ url })),
);
const environments = computed(() => props.project?.environments ?? []);
const visibleEnvironments = computed(() => environments.value.slice(0, 4));
const overflowMenu = ref<InstanceType<typeof Menu>>();
const menuSource = ref('');
const overflowItems = computed(() =>
  environments.value.slice(4).map((environment) => ({
    label: environment.name,
    disabled: !environment.address.trim(),
    command: () => emit('openEnvironment', menuSource.value, environment.id),
  })),
);
const showOverflow = (event: Event, source: string) => {
  menuSource.value = source;
  overflowMenu.value?.toggle(event);
};
watch(
  () => props.project?.id,
  () => overflowMenu.value?.hide(),
);
</script>

<template>
  <Panel class="min-w-0">
    <template #header="{ id }">
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <h2
          :id="id"
          class="text-xl font-semibold"
        >
          {{ t('history') }}
        </h2>
        <Button
          v-if="historyRows.length"
          :label="t('clearHistory')"
          icon="pi pi-trash"
          severity="secondary"
          text
          :loading="clearing"
          @click="emit('clear')"
        />
      </div>
    </template>
    <DataTable
      v-if="historyRows.length"
      :value="historyRows"
      data-key="url"
      :paginator="historyRows.length > 10"
      :rows="10"
      size="small"
      table-style="table-layout: fixed; width: 100%"
      :show-headers="false"
      :table-props="{ 'aria-label': t('historyUrl') }"
    >
      <Column
        field="url"
        :header="t('historyUrl')"
        body-class="px-0"
      >
        <template #body="{ data }">
          <div class="history-row">
            <Button
              :label="data.url"
              :title="data.url"
              icon="pi pi-link"
              link
              size="small"
              class="history-source"
              :pt="{
                label: { class: 'history-label' },
                icon: { class: 'shrink-0' },
              }"
              @click="emit('open', data.url)"
            />
            <div
              v-if="environments.length"
              class="history-environments"
            >
              <Button
                v-for="environment in visibleEnvironments"
                :key="environment.id"
                :label="environment.name"
                :title="environment.name"
                :disabled="!environment.address.trim()"
                severity="secondary"
                outlined
                size="small"
                class="history-environment"
                :pt="{ label: { class: 'history-label' } }"
                @click="emit('openEnvironment', data.url, environment.id)"
              />
              <Button
                v-if="overflowItems.length"
                icon="pi pi-ellipsis-h"
                :aria-label="t('moreEnvironments')"
                :title="t('moreEnvironments')"
                aria-haspopup="menu"
                aria-controls="history-environments-menu"
                severity="secondary"
                outlined
                size="small"
                class="shrink-0"
                @click="showOverflow($event, data.url)"
              />
            </div>
          </div>
        </template>
      </Column>
    </DataTable>
    <p
      v-else
      class="text-slate-600"
    >
      {{ t('emptyHistory') }}
    </p>
    <Menu
      id="history-environments-menu"
      ref="overflowMenu"
      :model="overflowItems"
      popup
    />
  </Panel>
</template>
