<script setup lang="ts">

type TColumn = {
  title?: string;
  key?: string;
  align?: 'left' | 'right' | 'center';
};
const props = withDefaults(defineProps<{
  label?: string;
  type?: 'text' | 'number';
  name?: string;
  inputId?: string;
  placeholder?: string;
}>(), {
  type: 'text',
  inputId: useId(),
})

const model = defineModel();

</script>

<template>
  <table class="min-w-full divide-y divide-gray-300">
    <thead>
    <tr>
      <th scope="col" class="py-3.5 pr-3 text-left text-sm font-semibold text-gray-900 pl-0">From</th>
      <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden sm:table-cell">To</th>
      <th scope="col" class="relative py-3.5 pl-3 pr-0">
        <span class="sr-only">Edit</span>
      </th>
    </tr>
    </thead>
    <tbody class="divide-y divide-gray-200 bg-white">
    <tr>
      <td class="whitespace-nowrap py-4 pl-0 pr-3 text-sm font-medium text-gray-900">b2b.center</td>
      <td class="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell"></td>
      <td class="whitespace-nowrap py-4 pl-3 pr-0 text-right text-sm font-medium">
        <a href="#" class="text-indigo-600 hover:text-indigo-900">Edit<span class="sr-only">, Lindsay Walton</span></a>
      </td>
    </tr>
    <tr>
      <td class="whitespace-nowrap py-4 pl-0 pr-3 text-sm font-medium text-gray-900">b2b.center</td>
      <td class="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell"></td>
      <td class="whitespace-nowrap py-4 pl-3 pr-0 text-right text-sm font-medium">
        <a href="#" class="text-indigo-600 hover:text-indigo-900">Edit<span class="sr-only">, Lindsay Walton</span></a>
      </td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>
</style>