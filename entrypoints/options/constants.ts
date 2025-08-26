export const HISTORY_STORAGE_NAME = 'history';
export const HOSTS_STORAGE_NAME = 'listOfHosts';
export const CURRENT_HOST_STORAGE_NAME = 'currentHost';
export const RULES_STORAGE_NAME = 'ruleList';

export const MAX_HOSTS_COUNT = 10;

export const getSyncedStorageName = (storageName: string): `sync:${string}` => `sync:${storageName}`;