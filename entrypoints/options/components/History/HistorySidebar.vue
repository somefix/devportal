<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';

import DPButton from '@/shared/components/DPButton.vue';
import DPSidebar from '@/shared/components/DPSidebar.vue';
import HistoryList from '@/entrypoints/options/components/History/HistoryList.vue';

import { IHistoryProps } from '@/entrypoints/options/components/History/HistoryDomain';

const model = defineModel<boolean>();

const props = defineProps<IHistoryProps>();
</script>

<template>
  <DPSidebar v-model:open="model" overlay title="История">
    <template #activator="{ onOpen }">
      <DPButton outline @click="onOpen">
        <FontAwesomeIcon :icon="faClockRotateLeft" />
      </DPButton>
    </template>

    <template #default>
      <HistoryList v-bind="props" />
    </template>

  </DPSidebar>
</template>