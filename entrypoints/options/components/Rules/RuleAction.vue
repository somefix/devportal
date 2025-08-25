<script setup lang="ts">
import { ref } from 'vue';

import DPButton from '@/shared/components/DPButton.vue';
import DPInput from '@/shared/components/DPInput.vue';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { IRuleAddEmits } from './RulesDomain';

interface IRuleActionsEmits extends IRuleAddEmits {}
interface IRuleActionsProps {
  disabled?: boolean;
}

const props = defineProps<IRuleActionsProps>();
const emit = defineEmits<IRuleActionsEmits>();

const from = ref<string>('');
const to = ref<string>('');

const fromInput = ref<HTMLDivElement | null>(null);
const toInput = ref<HTMLDivElement | null>(null);

const addButtonDisabled = computed(() => props.disabled || !from.value);

const onAddRuleHandler = () => {
  if (from.value) {
    emit('add', { from: from.value, to: to.value });

    from.value = '';
    to.value = '';

    fromInput.value?.focus();
  }
};
const onFromEnter = () => {
  if (from.value) {
    toInput.value?.focus();
  }
};
</script>

<template>
  <div class="flex gap-4 max-w-2xl max-md:flex-wrap">
    <DPInput
      v-model="from"
      ref="fromInput"
      placeholder="From"
      class="max-md:w-full min-md:flex-1"
      @enter="onFromEnter"
    />

    <DPInput
      v-model="to"
      ref="toInput"
      placeholder="To"
      class="flex-1"
      @enter="onAddRuleHandler"
    />

    <DPButton @click="onAddRuleHandler" :disabled="addButtonDisabled">
      <FontAwesomeIcon :icon="faPlus" />
    </DPButton>
  </div>
</template>

<style scoped>

</style>