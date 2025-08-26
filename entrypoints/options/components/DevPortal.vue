<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import DPInput from "@/shared/components/DPInput.vue";
import DPButton from "@/shared/components/DPButton.vue";
import ListOfHosts from "@/entrypoints/options/components/ListOfHosts.vue";
import RulesSidebar from '@/entrypoints/options/components/Rules/RulesSidebar.vue';
import HistorySidebar from '@/entrypoints/options/components/History/HistorySidebar.vue';

import {
  CURRENT_HOST_STORAGE_NAME,
  getSyncedStorageName,
  HISTORY_STORAGE_NAME,
  HOSTS_STORAGE_NAME,
  RULES_STORAGE_NAME,
  MAX_HOSTS_COUNT
} from '@/entrypoints/options/constants';
import { MAX_RULES_COUNT, TRule } from '@/entrypoints/options/components/Rules/RulesDomain';

const host = ref<string>('');
const currentHost = ref<string>('');
const listOfHosts = ref<string[]>([]);
const historyList = ref<string[]>([]);
const ruleList = ref<TRule[]>([]);
const isShowRulesList = ref(false);
const isShowHistoryList = ref(false);

const addHostButtonDisabled = computed(() => !host.value || listOfHosts.value.length >= MAX_HOSTS_COUNT);

watch(currentHost, (newValue) => setStorageValue(CURRENT_HOST_STORAGE_NAME, newValue));
watch(listOfHosts, (newValue) => setStorageValue(HOSTS_STORAGE_NAME, [...newValue]));
watch(ruleList, (newValue) => setStorageValue(RULES_STORAGE_NAME, [...newValue]));

onMounted(async () => {
  await syncStorage();
});

const syncStorage = async () => {
  currentHost.value = await storage.getItem(getSyncedStorageName(CURRENT_HOST_STORAGE_NAME)) ?? '';
  listOfHosts.value = await storage.getItem(getSyncedStorageName(HOSTS_STORAGE_NAME)) ?? [];
  historyList.value = await storage.getItem(getSyncedStorageName(HISTORY_STORAGE_NAME)) ?? [];
  ruleList.value = await storage.getItem(getSyncedStorageName(RULES_STORAGE_NAME)) ?? [];
};

const setStorageValue = (alias: string, value: unknown) => {
  storage.setItem(`sync:${alias}`, value);
};


const addHost = () => {
  if (listOfHosts.value.length < MAX_HOSTS_COUNT) {
    removeHost(host.value);

    listOfHosts.value = [...listOfHosts.value, host.value];
    currentHost.value = currentHost.value || host.value;
    host.value = '';
  }
}
const selectCurrentHost = (host: string) => {
  currentHost.value = host;
}
const removeHost = (host: string) => {
  listOfHosts.value = listOfHosts.value.filter((item) => item !== host);

  if (!listOfHosts.value.length) {
    currentHost.value = '';
  }
}

const isSameRule = (rule1: TRule, rule2: TRule) => rule1.from === rule2.from && rule1.to === rule2.to;
const addRule = (rule: TRule) => {
  if (ruleList.value.length < MAX_RULES_COUNT) {
    removeRule(rule);

    ruleList.value = [...ruleList.value, rule];
  }
}
const removeRule = (rule: TRule) => {
  ruleList.value = ruleList.value.filter((item) => !isSameRule(item, rule));
}

</script>

<template>
  <form class="grid grid-cols-3 gap-x-4 gap-y-8">
    <div class="max-md:col-span-full col-span-2 flex items-end gap-4">
      <DPInput
        v-model="host"
        prependText="https://"
        class="grow"
        placeholder="Хост для подмены:"
        input-id="localhost"
        @enter="addHost"
      />

      <DPButton
        :disabled="addHostButtonDisabled"
        @click="addHost"
      >
        <FontAwesomeIcon :icon="faPlus" />
      </DPButton>

      <RulesSidebar
        v-model="isShowRulesList"
        :rules="ruleList"
        @add="addRule"
        @remove="removeRule"
      />

      <HistorySidebar
        v-model="isShowHistoryList"
        :links="historyList"
      />
    </div>

    <ListOfHosts
      class="col-span-2 max-md:col-span-full"
      :hosts="listOfHosts"
      :currentHost="currentHost"
      @select="selectCurrentHost"
      @remove="removeHost"
    />
  </form>
</template>