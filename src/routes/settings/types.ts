import type { Component } from "svelte";
import type { UserSettings } from "$lib/settings";

interface GroupField {
	type: "group";
	label?: string;
	fields: SettingsField[];
}

export interface BaseField {
	id: keyof UserSettings | (string & {});
	label: string;
	description?: string;
	disabled?: () => boolean;
}

interface CustomField extends BaseField {
	type: "custom";
	renderAs?: "field" | "set";
	component: Component;
}

interface InputField extends BaseField {
	type: "input";
	placeholder?: string;
}

interface ChoiceItem {
	label: string;
	value: string;
	description?: string;
}

interface RadioField extends BaseField {
	type: "radio";
	items: ChoiceItem[];
}

interface SelectField extends BaseField {
	type: "select";
	items: ChoiceItem[];
}

interface SliderField extends BaseField {
	type: "slider";
	thumbLabel?: string;
	tickLabel?: string;
	min?: number;
	max?: number;
	step?: number | number[];
}

interface SwitchField extends BaseField {
	type: "switch";
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
