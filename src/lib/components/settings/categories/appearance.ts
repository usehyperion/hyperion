import Monitor from "~icons/ph/palette";
import Custom from "../custom/theme/Custom.svelte";
import Default from "../custom/theme/Default.svelte";
import type { SettingsCategory } from "../types";

export default {
	order: 10,
	label: "Appearance",
	icon: Monitor,
	fields: [
		{
			id: "appearance.default",
			type: "custom",
			label: "Default theme",
			component: Default,
		},
		{
			id: "appearance.theme",
			type: "custom",
			label: "Custom theme",
			description:
				"Completely customize the appearance of the application with CSS. Make your own or download themes created by the community.",
			component: Custom,
		},
	],
} satisfies SettingsCategory;
