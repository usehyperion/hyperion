import { app } from "$lib/app.svelte";
import Toolbox from "~icons/ph/toolbox";
import ClearCache from "../custom/ClearCache.svelte";
import type { SettingsCategory } from "../types";

export default {
	order: 9999,
	label: "Advanced",
	icon: Toolbox,
	fields: [
		{
			id: "advanced.singleConnection",
			type: "switch",
			label: "Only join one channel at a time",
			description:
				"Limit the application to joining only one channel at a time to reduce resource usage. Enable this if you are experiencing performance issues. Split view will be disabled when this is active.",
			async onchange(value) {
				if (!value) return;

				app.splits.root = null;

				await Promise.all(
					app.channels
						.values()
						.filter((c) => c.joined)
						.map((c) => c.leave()),
				);
			},
		},
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
