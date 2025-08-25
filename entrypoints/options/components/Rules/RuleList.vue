<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faTrash, faSliders, faTurnDown } from "@fortawesome/free-solid-svg-icons";

import DPButton from "@/shared/components/DPButton.vue";
import DPEmptyState from "@/shared/components/DPEmptyState.vue";

import { IRuleRemoveEmits, IRulesProps } from '@/entrypoints/options/components/Rules/RulesDomain';

interface IRuleListEmits extends IRuleRemoveEmits {}

const props = defineProps<IRulesProps>();
const emit = defineEmits<IRuleListEmits>();

const rules = computed(() => [...(props?.rules ?? [])].reverse());
</script>

<template>
  <ul role="list" class="divide-y divide-gray-100">
    <DPEmptyState v-if="!rules.length" title="Список правил пуст">
      <template #icon>
        <FontAwesomeIcon :icon="faSliders" size="3x" class="text-gray-400" />
      </template>
    </DPEmptyState>

    <li v-for="rule of rules" class="flex items-center justify-between gap-4 py-2">
      <div class="min-w-0">
        <div class="flex items-end gap-x-3">
          <span class="text-left text-sm font-semibold text-gray-900">{{ rule.from }}</span>

          <FontAwesomeIcon class="accent-green-500" :icon="faTurnDown" />
        </div>

        <div class="mt-1 flex items-center gap-x-2 text-xs/5 text-gray-500">
          <p class="whitespace-nowrap">
            {{ rule.to || '/' }}
          </p>
        </div>
      </div>

      <div class="flex flex-none items-center">
        <DPButton @click="() => emit('remove', rule)" outline>
          <FontAwesomeIcon :icon="faTrash" class="text-indigo-400" />
        </DPButton>
      </div>
    </li>
  </ul>
</template>