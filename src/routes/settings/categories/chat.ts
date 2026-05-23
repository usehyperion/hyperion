import { settings } from "$lib/settings";
import Chat from "~icons/ph/chat";
import type { SettingsCategory } from "../types";

export default {
	order: 20,
	label: "Chat",
	icon: Chat,
	fields: [
		{
			type: "group",
			fields: [
				{
					id: "chat.hideScrollbar",
					type: "switch",
					label: "Hide scrollbar",
					description: "Toggle the visibility of the scrollbar.",
				},
				{
					id: "chat.newSeparator",
					type: "switch",
					label: "New messages separator",
					description: "Show a separator for new messages when the window loses focus.",
				},
				{
					id: "chat.embeds",
					type: "switch",
					label: "Enable embeds",
					description: "Show embedded content for supported links.",
				},
			],
		},
		{
			type: "group",
			label: "Badges",
			fields: [
				{
					id: "chat.badges.ffz",
					type: "switch",
					label: "Enable FrankerFaceZ badges",
					description:
						'Show badges from <a href="https://www.frankerfacez.com/" target="_blank">FrankerFaceZ</a>.',
				},
				{
					id: "chat.badges.bttv",
					type: "switch",
					label: "Enable BetterTTV badges",
					description:
						'Show badges from <a href="https://betterttv.com/" target="_blank">BetterTTV</a>.',
				},
				{
					id: "chat.badges.seventv",
					type: "switch",
					label: "Enable 7TV badges",
					description:
						'Show badges from <a href="https://7tv.app/" target="_blank">7TV</a>.',
				},
			],
		},
		{
			type: "group",
			label: "Usernames",
			fields: [
				{
					id: "chat.usernames.localized",
					type: "switch",
					label: "Display localized names",
					description:
						"Show the user's localized display name if they have their Twitch language set to Arabic, Chinese, Japanese, or Korean.",
				},
				{
					id: "chat.usernames.readable",
					type: "switch",
					label: "Readable name colors",
					description:
						"Lightens or darkens the color of usernames based on the current theme. This does not apply to 7TV paints.",
				},
				{
					id: "chat.usernames.randomColor",
					type: "switch",
					label: "Assign random colors",
					description:
						"Assign a random Twitch color to usernames that do not have a color set.",
				},
				{
					id: "chat.usernames.paint",
					type: "switch",
					label: "Paint usernames",
					description: "Style usernames with 7TV paints if the user has one.",
				},
				{
					id: "chat.usernames.mentionStyle",
					type: "radio",
					label: "Mention style",
					description:
						"Choose how mentions in messages are displayed. Painted mentions will fallback to the user's color if they have no 7TV paint.",
					items: [
						{ label: "None", value: "none" },
						{ label: "Colored", value: "colored" },
						{ label: "Painted", value: "painted" },
					],
				},
			],
		},
		{
			type: "group",
			label: "Emotes",
			fields: [
				{
					id: "chat.emotes.ffz",
					type: "switch",
					label: "Enable FrankerFaceZ emotes",
					description:
						'Show and autocomplete emotes from <a href="https://www.frankerfacez.com/" target="_blank">FrankerFaceZ</a>.',
				},
				{
					id: "chat.emotes.bttv",
					type: "switch",
					label: "Enable BetterTTV emotes",
					description:
						'Show and autocomplete emotes from <a href="https://betterttv.com/" target="_blank">BetterTTV</a>.',
				},
				{
					id: "chat.emotes.seventv",
					type: "switch",
					label: "Enable 7TV emotes",
					description:
						'Show and autocomplete emotes from <a href="https://7tv.app/" target="_blank">7TV</a>.',
				},
				{
					id: "chat.emotes.padding",
					type: "slider",
					label: "Padding",
					description: "Adjust the spacing around emotes in chat.",
					thumbLabel: "{value}px",
					min: 0,
					max: 10,
					step: 1,
				},
			],
		},
		{
			type: "group",
			label: "Messages",
			fields: [
				{
					id: "chat.messages.duplicateBypass",
					type: "switch",
					label: "Bypass duplicate message warning",
					description:
						"Allows you to send identical messages even if you're not a moderator or a VIP.",
				},
				{
					type: "group",
					label: "History",
					fields: [
						{
							id: "chat.messages.history.enabled",
							type: "switch",
							label: "Fetch recent messages upon joining a channel",
							description:
								'This feature uses a <a href="https://recent-messages.robotty.de/" target="_blank">third-party API</a> that temporarily stores the messages sent in joined channels. To opt-out, disable this setting.',
						},
						{
							id: "chat.messages.history.limit",
							type: "slider",
							label: "Limit",
							description:
								"Change how many previous messages to load when joining a channel.",
							min: 0,
							max: 800,
							step: 50,
							disabled: () => !settings.state["chat.messages.history.enabled"],
						},
						{
							id: "chat.messages.history.separator",
							type: "switch",
							label: "Separate recent messages",
							description: "Show a separator between recent and live messages.",
						},
					],
				},
				{
					type: "group",
					label: "Timestamps",
					fields: [
						{
							id: "chat.messages.timestamps.show",
							type: "switch",
							label: "Show timestamps next to messages",
						},
						{
							id: "chat.messages.timestamps.format",
							type: "radio",
							label: "Format",
							items: [
								{ label: "Auto", value: "auto" },
								{ label: "12-hour", value: "12" },
								{ label: "24-hour", value: "24" },
								{ label: "Custom", value: "custom" },
							],
							disabled: () => !settings.state["chat.messages.timestamps.show"],
						},
						{
							id: "chat.messages.timestamps.customFormat",
							type: "input",
							label: "Custom format",
							description:
								'Formats use the same <a href="https://day.js.org/docs/en/display/format" target="_blank">tokens</a> as <a href="https://day.js.org/en" target="_blank">Day.js</a>. Localized formats are also enabled.',
							placeholder: "e.g. HH:mm:ss",
							disabled: () =>
								settings.state["chat.messages.timestamps.format"] !== "custom",
						},
					],
				},
			],
		},
	],
} satisfies SettingsCategory;
