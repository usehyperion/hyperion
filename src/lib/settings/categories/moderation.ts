import { timeoutPresets } from "$lib/moderation";

import Shield from "~icons/ph/shield";

import type { SettingsCategory } from "../types";

export default {
	order: 40,
	label: "Moderation",
	icon: Shield,
	fields: [
		{
			type: "group",
			label: "Actions",
			fields: [
				{
					id: "moderation.timeout.duration",
					type: "select",
					label: "Default timeout duration",
					description:
						"How long the timeout quick action and context menu entry time a viewer out for.",
					keywords: ["ban", "punishment", "length"],
					items: timeoutPresets,
				},
				{
					id: "moderation.quickActions.show",
					type: "switch",
					label: "Show moderation quick actions",
					description:
						"Show the delete, timeout, and ban buttons when hovering over a message.",
					keywords: ["hover", "toolbar", "buttons"],
				},
			],
		},
		{
			type: "group",
			label: "Deleted messages",
			fields: [
				{
					id: "moderation.deleted.appearance",
					type: "radio",
					label: "Appearance",
					description: "Choose how messages deleted by a moderator are displayed.",
					keywords: ["removed", "purged", "clearmsg"],
					items: [
						{
							label: "Dimmed",
							value: "dim",
							description: "Fade the whole message out.",
						},
						{
							label: "Striked",
							value: "strike",
							description: "Draw a line through the message text.",
						},
						{
							label: "Blurred",
							value: "blur",
							description: "Blur the message until you hover over it.",
						},
					],
				},
			],
		},
	],
} satisfies SettingsCategory;
