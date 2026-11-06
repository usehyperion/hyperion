import type { Channel } from "#lib/models/channel.svelte.js";
import type { Notice } from "#lib/models/notice.svelte.js";

import { command } from "../define";

const notices: [name: string, label: string, get: (channel: Channel) => Notice | null][] = [
	["pin", "the pinned message", (channel) => channel.chat.pinned],
	["poll", "the poll", (channel) => channel.poll],
	["prediction", "the prediction", (channel) => channel.prediction],
];

export default notices.flatMap(([name, label, get]) =>
	[false, true].map((hidden) =>
		command({
			name: `${hidden ? "hide" : "show"}-${name}`,
			description: `${hidden ? "Hide" : "Show"} ${label} in chat`,
			exec(_, channel) {
				const notice = get(channel);
				if (notice) notice.hidden = hidden;
			},
		}),
	),
);
