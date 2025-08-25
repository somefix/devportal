<script setup lang="ts">
const props = defineProps<{ title?: string; description?: string; }>();

const title = computed(() => props?.title ?? '');
const description = computed(() => props?.description ?? '');
</script>

<template>
  <div class="text-center my-4 flex flex-col gap-2">
    <slot name="icon" />

    <h3 class="mt-2 text-sm font-semibold text-gray-900">{{ title }}</h3>

    <p class="mt-1 text-sm text-gray-500">{{ description }}</p>
  </div>
</template>