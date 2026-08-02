import Layout from "~icons/ph/layout";
import type { SettingsCategory } from "../types";

export default {
	order: 15,
	label: "Splits",
	icon: Layout,
	fields: [
		{
			id: "splits.leaveOnClose",
			type: "switch",
			label: "Leave channel on close",
			description: "Automatically leave a channel when closing its tab.",
		},
	],
} satisfies SettingsCategory;
