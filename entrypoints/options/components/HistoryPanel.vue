<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Panel from 'primevue/panel';
import { t } from '@/shared/i18n';

const props = defineProps<{
  history: string[];
  clearing: boolean;
}>();

const emit = defineEmits<{
  clear: [];
  open: [source: string];
}>();

const historyRows = computed(() =>
  [...new Set(props.history)].map((url) => ({ url })),
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
      :paginator="historyRows.length > 5"
      :rows="5"
      size="small"
      :pt="{ thead: { class: 'sr-only' } }"
    >
      <Column
        field="url"
        :header="t('historyUrl')"
        body-class="px-0"
      >
        <template #body="{ data }">
          <Button
            :label="data.url"
            link
            size="small"
            class="max-w-full px-0 text-left"
            :pt="{ label: { class: 'wrap-anywhere' } }"
            @click="emit('open', data.url)"
          />
        </template>
      </Column>
    </DataTable>
    <p
      v-else
      class="text-slate-600"
    >
      {{ t('emptyHistory') }}
    </p>
  </Panel>
</template>
