import Toolbox from "~icons/ph/toolbox";

import ClearCache from "#lib/components/settings/custom/ClearCache.svelte";

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
			label: "Chat",
			fields: [
				{
					id: "advanced.chat.renderMode",
					type: "radio",
					label: "Rendering mode",
					description: "Change how new messages are added to the chat.",
					items: [
						{
							label: "Immediate",
							value: "immediate",
							description: "Render each message as soon as it arrives.",
						},
						{
							label: "Yield",
							value: "yield",
							description:
								"Batch messages into a single update per frame and periodically yield to the main thread while loading recent messages. May improve responsiveness in busy chats at the cost of messages appearing up to a frame later.",
						},
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
