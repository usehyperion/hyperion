import type { Component } from "svelte";

import type { Settings } from "#lib/settings.js";

type SettingKey = keyof Settings;

/**
 * Keys of {@linkcode Settings} whose value is assignable to `T`.
 */
type KeysWithValue<T> = {
	[K in SettingKey]: Settings[K] extends T ? K : never;
}[SettingKey];

/**
 * Keys of {@linkcode Settings} whose value is exactly `T`.
 */
type KeysWithExactValue<T> = {
	[K in SettingKey]: [Settings[K]] extends [T] ? ([T] extends [Settings[K]] ? K : never) : never;
}[SettingKey];

export interface BaseField<Id extends string = string> {
	id: Id;
	label: string;
	description?: string;
	keywords?: string[];
	disabled?: () => boolean;
}

interface GroupField {
	type: "group";
	label?: string;
	fields: SettingsField[];
}

interface CustomField extends BaseField {
	type: "custom";
	component: Component;
}

interface InputField extends BaseField<KeysWithExactValue<string>> {
	type: "input";
	placeholder?: string;
}

interface ChoiceItem<Value extends string> {
	label: string;
	value: Value;
	description?: string;
}

interface ChoiceFieldFor<K extends KeysWithValue<string>> extends BaseField<K> {
	type: "radio" | "select";
	items: ChoiceItem<Settings[K] & string>[];
}

/**
 * A radio group or select whose items are the values of the setting.
 */
type ChoiceField = {
	[K in KeysWithValue<string>]: ChoiceFieldFor<K>;
}[KeysWithValue<string>];

interface SliderField extends BaseField<KeysWithValue<number>> {
	type: "slider";
	formatValue?: (value: number) => string;
	showSteps?: boolean;
	min?: number;
	max?: number;
	step?: number | number[];
}

interface SwitchField extends BaseField<KeysWithValue<boolean>> {
	type: "switch";
}

export type SettingsField =
	| GroupField
	| CustomField
	| InputField
	| ChoiceField
	| SliderField
	| SwitchField;

export interface SettingsCategory {
	order: number;
	label: string;
	icon: Component;
	fields: SettingsField[];
}
