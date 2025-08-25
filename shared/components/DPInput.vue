<script setup lang="ts">
import { ref } from 'vue';

interface IDPInputEmits {
  (event: 'enter'): void;
}

const model = defineModel();

const props = withDefaults(defineProps<{
  label?: string;
  type?: 'text' | 'number';
  name?: string;
  inputId?: string;
  placeholder?: string;
  prependText?: string;
}>(), {
  type: 'text',
  inputId: 'useId()',
});
const emit = defineEmits<IDPInputEmits>();

const inputRef = ref<HTMLInputElement | null>(null);

defineExpose({
  focus: () => inputRef.value?.focus(),
  input: inputRef
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="props.label" :for="props.name || props.inputId" class="block text-sm/6 font-medium text-gray-900">
      {{ props.label }}
    </label>

    <div class="mt-2 flex">
      <div
        v-if="prependText"
        class="flex shrink-0 items-center rounded-l-md bg-white px-3 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 dark:bg-white/5 dark:text-gray-400 dark:outline-gray-700"
      >
        {{ prependText }}
      </div>

      <input
        v-model="model"
        :name="props.name || props.inputId"
        :type="props.type"
        :id="props.inputId"
        :placeholder="props.placeholder"
        :class="{ '-ml-px rounded-r-md grow': props.prependText, 'rounded-md': !props.prependText }"
        ref="inputRef"
        class="block w-full bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
        @keyup.enter.prevent.stop="() => emit('enter')"
      />
    </div>
  </div>
</template>

<style scoped>
</style>