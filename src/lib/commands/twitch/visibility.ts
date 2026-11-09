import type { Channel } from "#lib/models/channel.svelte.js";
import type { Notice as NoticeModel } from "#lib/models/notice.svelte.js";

import { command } from "../define";

interface Notice {
	name: string;
	label: string;
	get: (channel: Channel) => NoticeModel | null;
}

const notices: Notice[] = [
	{
		name: "pin",
		label: "the pinned message",
		get: (channel) => channel.chat.pinned,
	},
	{
		name: "poll",
		label: "the poll",
		get: (channel) => channel.poll,
	},
	{
		name: "prediction",
		label: "the prediction",
		get: (channel) => channel.prediction,
	},
];

function visibility(hidden: boolean, notice: Notice) {
	return command({
		name: `${hidden ? "hide" : "show"}-${notice.name}`,
		description: `${hidden ? "Hide" : "Show"} ${notice.label} in chat`,
		exec(_, channel) {
			const model = notice.get(channel);

			if (model) {
				model.hidden = hidden;
			}
		},
	});
}

export default notices.flatMap((notice) => [visibility(false, notice), visibility(true, notice)]);
