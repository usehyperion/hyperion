import type { Component } from "svelte";
import type { Settings } from "$lib/settings";

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
	renderAs?: "field" | "set";
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

interface RadioFieldFor<K extends KeysWithValue<string>> extends BaseField<K> {
	type: "radio";
	items: ChoiceItem<Settings[K] & string>[];
}

interface SelectFieldFor<K extends KeysWithValue<string>> extends BaseField<K> {
	type: "select";
	items: ChoiceItem<Settings[K] & string>[];
}

type RadioField = {
	[K in KeysWithValue<string>]: RadioFieldFor<K>;
}[KeysWithValue<string>];

type SelectField = {
	[K in KeysWithValue<string>]: SelectFieldFor<K>;
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
	onchange?: (value: boolean) => void;
}

export type SettingsField =
	| GroupField
	| CustomField
	| InputField
	| RadioField
	| SelectField
	| SliderField
	| SwitchField;

export interface SettingsCategory {
	order: number;
	label: string;
	icon: Component;
	fields: SettingsField[];
}
