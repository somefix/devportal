export const HISTORY_STORAGE_NAME = 'history';
export const HOSTS_STORAGE_NAME = 'listOfHosts';
export const CURRENT_HOST_STORAGE_NAME = 'currentHost';
export const RULES_STORAGE_NAME = 'ruleList';

export const getSyncedStorageName = (storageName: string): `sync:${string}` => `sync:${storageName}`;