import { IconSplits } from "#lib/icons.js";

import type { SettingsCategory } from "../types";

export default {
	order: 15,
	label: "Splits",
	icon: IconSplits,
	fields: [
		{
			id: "splits.leaveOnClose",
			type: "switch",
			label: "Leave channel on close",
			description: "Automatically leave a channel when closing its tab.",
		},
	],
} satisfies SettingsCategory;
