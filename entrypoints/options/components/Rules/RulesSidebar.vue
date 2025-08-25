<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';

import DPButton from '@/shared/components/DPButton.vue';
import DPSidebar from '@/shared/components/DPSidebar.vue';
import RuleList from '@/entrypoints/options/components/Rules/RuleList.vue';
import RuleAction from '@/entrypoints/options/components/Rules/RuleAction.vue';

import { IRuleAddEmits, IRuleRemoveEmits, IRulesProps } from './RulesDomain';

interface IRulesEmits extends IRuleAddEmits, IRuleRemoveEmits {}

const model = defineModel<boolean>();

const props = defineProps<IRulesProps>();
const emit = defineEmits<IRulesEmits>();
</script>

<template>
  <DPSidebar v-model:open="model" overlay title="Правила замены">
    <template #activator="{ onOpen }">
      <DPButton outline @click="onOpen">
        <FontAwesomeIcon :icon="faSliders" />
      </DPButton>
    </template>

    <template #default>
      <div class="flex flex-col gap-4">
        <p class="mt-4 text-sm text-gray-700">
          Путь URL преобразуется согласно заданным правилам: расширение перебирает каждое правило из списка и, если путь начинается с указанной в правиле строки from, заменяет её на to.
        </p>

        <RuleAction @add="(rule) => emit('add', rule)" />

        <RuleList v-bind="props" @remove="(rule) => emit('remove', rule)" />
      </div>
    </template>
  </DPSidebar>
</template>