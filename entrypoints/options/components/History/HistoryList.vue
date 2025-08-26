<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faArrowUpRightFromSquare, faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";

import DPButton from "@/shared/components/DPButton.vue";
import DPEmptyState from "@/shared/components/DPEmptyState.vue";

import { IHistoryProps } from '@/entrypoints/options/components/History/HistoryDomain';

const props = defineProps<IHistoryProps>();

const links = computed(() => props?.links ?? []);
</script>

<template>
  <ul role="list" class="divide-y divide-gray-100">
    <DPEmptyState v-if="!links.length" title="История пуста">
      <template #icon>
        <FontAwesomeIcon :icon="faClockRotateLeft" size="3x" class="text-gray-400" />
      </template>
    </DPEmptyState>

    <li v-for="link of links" class="flex items-center justify-between gap-4 py-2">
      <div class="truncate">
        <a :href="link" target="_blank" class="text-left text-sm text-blue-600">
          {{ link }}
        </a>
      </div>

      <div class="flex flex-none items-center">
        <DPButton outline>
          <FontAwesomeIcon :icon="faArrowUpRightFromSquare" class="text-indigo-400" />
        </DPButton>
      </div>
    </li>
  </ul>
</template>