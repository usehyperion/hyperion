import Toolbox from "~icons/ph/toolbox";
import ClearCache from "../custom/ClearCache.svelte";
import type { SettingsCategory } from "../types";

export default {
	order: 9999,
	label: "Advanced",
	icon: Toolbox,
	fields: [
		{
			type: "group",
			label: "Logs",
			fields: [
				{
					id: "advanced.logs.level",
					type: "select",
					label: "Level",
					description:
						"Set the verbosity of application logs. Higher levels provide more detailed information for debugging but may quickly grow in size.",
					items: [
						{ label: "Error", value: "error" },
						{ label: "Warn", value: "warn" },
						{ label: "Info", value: "info" },
						{ label: "Debug", value: "debug" },
						{ label: "Trace", value: "trace" },
					],
				},
			],
		},
		{
			type: "group",
			label: "Cache",
			fields: [
				{
					id: "advanced.cache.clear",
					type: "custom",
					label: "Clear",
					description: "Clear the application cache to free up space or resolve issues.",
					renderAs: "field",
					component: ClearCache,
				},
			],
		},
	],
} satisfies SettingsCategory;
