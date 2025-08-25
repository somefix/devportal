export type TRule = { from: string; to?: string; };

export interface IRuleAddEmits {
	(event: 'add', rule: TRule): void;
}

export interface IRuleRemoveEmits {
	(event: 'remove', rule: TRule): void;
}

export interface IRulesProps {
	rules?: TRule[];
}

export const MAX_RULES_COUNT = 10;