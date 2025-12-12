import Layout from "~icons/ph/layout";
import type { SettingsCategory } from "../types";

export default {
	order: 15,
	label: "Splits",
	icon: Layout,
	fields: [
		{
			id: "splits.defaultOrientation",
			type: "radio",
			label: "Default orientation",
			description:
				"Choose the default orientation when opening a new split with the keyboard.",
			items: [
				{
					label: "Horizontal",
					value: "horizontal",
					description: "New splits will open to the right of the focused split.",
				},
				{
					label: "Vertical",
					value: "vertical",
					description: "New splits will open below the focused split.",
				},
			],
		},
		{
			id: "splits.singleRestoreBehavior",
			type: "radio",
			label: "Restore behavior for a single split",
			description: "Choose what happens when restoring a layout with a single split.",
			items: [
				{
					label: "Preserve",
					value: "preserve",
					description: "Preserve the single split and restore it by itself.",
				},
				{
					label: "Redirect",
					value: "redirect",
					description:
						"Redirect to the channel contained in the split if it's not ephemeral and exit the layout.",
				},
				{
					label: "Remove",
					value: "remove",
					description: "Remove the split without redirecting and exit the layout.",
				},
			],
		},
		{
			id: "splits.closeBehavior",
			type: "radio",
			label: "Close behavior",
			description: "Choose what happens when closing a split.",
			items: [
				{
					label: "Preserve",
					value: "preserve",
					description:
						"Preserve the existing layout by replacing it with an empty split. If the split is already empty, it will be removed. Splits can be force closed with this option by Shift clicking close.",
				},
				{
					label: "Remove",
					value: "remove",
					description:
						"Remove it from the layout and adjust remaining splits accordingly.",
				},
			],
		},
		{
			id: "splits.leaveOnClose",
			type: "switch",
			label: "Leave channel on close",
			description: "Automatically leave the channel contained in a split when closing it.",
		},
		{
			id: "splits.goToChannelAfterClose",
			type: "switch",
			label: "Go to channel after closing last split",
			description:
				"If the closed split was the last one in the layout, navigate to the channel it contained. If the close behavior is set to <code>Preserve</code>, this will have no effect unless the split is force closed.",
		},
	],
} satisfies SettingsCategory;
