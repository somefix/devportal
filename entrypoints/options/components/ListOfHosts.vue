<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faTrash, } from "@fortawesome/free-solid-svg-icons";

import DPButton from "@/shared/components/DPButton.vue";

const props = defineProps<{ hosts?: string[], currentHost?: string }>();
const emit = defineEmits<{
  (event: 'remove', host: string): void
  (event: 'select', host: string): void
}
>();

const hosts = computed(() => props?.hosts ?? []);
const currentHost = computed(() => props?.currentHost ?? '');

const checkSelected = (host: string) => currentHost.value === host;
</script>

<template>
  <div>
    <ul role="list" class="divide-y divide-gray-100">
      <li v-for="host of hosts" class="flex items-center justify-between gap-4 py-2">
        <div class="min-w-0 flex gap-4 items-center">
          <input
            :id="host"
            :checked="checkSelected(host)"
            name="notification-method"
            type="radio"
            class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
            @change="() => emit('select', host)"
          />
          <label :for="host" class="ml-3 block text-sm/6 font-medium text-gray-900">{{ host }}</label>
        </div>

        <div class="flex flex-none items-center">
          <DPButton outline @click="emit('remove', host)">
            <FontAwesomeIcon :icon="faTrash" />
          </DPButton>
        </div>
      </li>
    </ul>
  </div>
</template>