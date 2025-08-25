<script setup lang="ts">

type TSizes = 'xs' | 's' | 'm' | 'l' | 'xl';
type TSizesClasses = Record<TSizes, string[]>

const props = withDefaults(defineProps<{
  size?: TSizes;
  outline?: boolean;
  flat?: boolean;
  disabled?: boolean;
}>(), {
  size: 'l',
  outline: false,
  flat: false,
  disabled: false,
});

const commonClasses = ['block', 'font-semibold', 'disabled:opacity-50 disabled:shadow-none'];
const outlineClasses = ['shadow-sm', 'bg-white', 'text-gray-900', 'ring-1', 'ring-inset', 'ring-gray-300', 'hover:bg-gray-50 disabled:hover:bg-white'];
const tonalClasses = ['shadow-sm', 'bg-indigo-600', 'text-white', 'hover:bg-indigo-500 disabled:hover:bg-indigo-600', 'focus-visible:outline', 'focus-visible:outline-2', 'focus-visible:outline-offset-2', 'focus-visible:outline-indigo-600'];
const classesBySize: TSizesClasses = {
  xs: ['rounded', 'px-2', 'py-1', 'text-sm'],
  s: ['rounded', 'px-2', 'py-1', 'text-xs'],
  m: ['rounded-md', 'px-2.5', 'py-1.5', 'text-sm'],
  l: ['rounded-md', 'px-3', 'py-2', 'text-sm'],
  xl: ['rounded-md', 'px-3.5', 'py-2.5', 'text-sm'],
};
const classesByVariant = {
  outline: outlineClasses,
  tonal: tonalClasses,
  flat: ['hover:text-current/60 disabled:hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'],
};
const variant = props.outline ? 'outline' : props.flat ? 'flat' : 'tonal';

const classes = computed(() => [...commonClasses, ...classesByVariant[variant], ...classesBySize[props.size]]);

</script>

<template>
  <button
    type="button"
    :class="classes"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>

</style>