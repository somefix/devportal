<script lang="ts" setup>
import { onMounted } from "vue";

import DevPortal from '@/entrypoints/options/components/DevPortal.vue';

const appName = ref('Devportal');


onMounted(async () => {
  const manifest = await browser.runtime.getManifest();

  appName.value = manifest.name;
});
</script>

<template>
  <main class="container mx-auto py-8">
    <div class="flex flex-col gap-6">
      <p class="text-2xl">Настройки "{{ appName }}"</p>

      <DevPortal />
    </div>
  </main>
</template>
