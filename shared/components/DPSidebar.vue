<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
import DPButton from "@/shared/components/DPButton.vue";

const props = withDefaults(defineProps<{
  title?: string;
  overlay?: boolean;
  size?: string;
}>(), {
  size: 'l',
  outline: false,
});

const model = defineModel({ default: false });
const toggle = (value?: boolean) => {
  if (value === undefined) {
    value = !model.value;
  }

  model.value = value;
}

</script>

<template>
  <div>
    <slot name="activator" @open="() => toggle(true)" @close="() => toggle(false)" :toggle="toggle">
      <button class="rounded-md bg-gray-950/5 px-2.5 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-950/10" @click.prevent="model = true">Open drawer</button>
    </slot>

    <TransitionRoot as="template" :show="model">
      <Dialog class="relative z-10" @close="model = false">

        <TransitionChild v-if="props.overlay" as="template" enter="ease-in-out duration-500" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in-out duration-500" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>

        <div v-else class="fixed inset-0" />

        <div class="fixed inset-0 overflow-hidden">
          <div class="absolute inset-0 overflow-hidden">
            <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <TransitionChild as="template" enter="transform transition ease-in-out duration-500 sm:duration-700" enter-from="translate-x-full" enter-to="translate-x-0" leave="transform transition ease-in-out duration-500 sm:duration-700" leave-from="translate-x-0" leave-to="translate-x-full">
                <DialogPanel class="pointer-events-auto w-screen max-w-2xl">
                  <div class="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                    <div class="flex shrink-0 justify-between px-4 sm:px-6 py-4">
                      <DialogTitle class="text-base font-semibold text-gray-900">{{ props.title }}</DialogTitle>

                      <div class="ml-3 flex h-7 items-center">
                        <DPButton class="text-gray-400" flat @click="model = false">
                          <FontAwesomeIcon size="xl" :icon="faXmark" />
                        </DPButton>
                      </div>
                    </div>

                    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
                      <div class="relative flex-1 px-4 sm:px-6">
                        <!-- Your content -->
                        <slot />
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
<style scoped>

</style>