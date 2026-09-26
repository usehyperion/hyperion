import dayjs from "dayjs";

import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, mapErrors } from "../util";

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

		const marker = await mapErrors(
			() => channel.createMarker(description),
			[
				{
					code: "MAX_DESCRIPTION_LENGTH_EXCEEDED",
					message: ErrorMessage.MARKER_DESC_TOO_LONG,
				},
				{
					code: "BROADCASTER_NOT_LIVE",
					message: ErrorMessage.CHANNEL_MUST_BE_LIVE,
				},
				{
					code: "ARCHIVES_DISABLED",
					message: ErrorMessage.ARCHIVES_DISABLED,
				},
				{
					code: "VOD_NOT_READY",
					message: ErrorMessage.VOD_NOT_READY,
				},
				{
					code: "USER_UNAUTHORIZED",
					message: ErrorMessage.NO_PERMISSION,
				},
			],
			ErrorMessage.COMMAND_FAILED,
		);
		if (!marker) return;

		const duration = dayjs.duration(marker.positionSeconds, "s");
		const format = duration.asHours() > 0 ? "H[h] mm[m] ss[s]" : "mm[m] ss[s]";

		const echo = description ? `: ${description}` : "";

		channel.chat.notice(`Stream marker created at ${duration.format(format) + echo}`);
	},
});
