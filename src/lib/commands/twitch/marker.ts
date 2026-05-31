import dayjs from "dayjs";
import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "marker",
	description: "Add a stream marker at the current timestamp",
	modOnly: true,
	args: ["description"],
	async exec(args, channel) {
		const description = args.join(" ");

		if (!channel.stream) {
			throw new CommandError(ErrorMessage.CHANNEL_MUST_BE_LIVE);
		}

		if (description.length > 140) {
			throw new CommandError(ErrorMessage.MARKER_DESC_TOO_LONG);
		}

		const marker = await channel.createMarker(description);

		const duration = dayjs.duration(marker.position_seconds, "s");
		const format = duration.asHours() > 0 ? "H[h] mm[m] ss[s]" : "mm[m] ss[s]";

		const echo = description ? `: ${description}` : "";

		channel.chat.notice(`Stream marker created at ${duration.format(format) + echo}`);
	},
});
