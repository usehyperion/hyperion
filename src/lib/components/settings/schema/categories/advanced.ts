import Toolbox from "~icons/ph/toolbox";

import { LOG_LEVELS } from "#lib/log.js";

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
					items: LOG_LEVELS.map((level) => ({
						label: level.charAt(0).toUpperCase() + level.slice(1),
						value: level,
					})),
				},
			],
		},
	],
} satisfies SettingsCategory;
