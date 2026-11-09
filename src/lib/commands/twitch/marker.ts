import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

const DESCRIPTION_TOO_LONG = "Marker description must be 140 characters or less.";

function pad(value: number) {
	return value.toString().padStart(2, "0");
}

function formatPosition(seconds: number) {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const time = `${pad(minutes)}m ${pad(seconds % 60)}s`;

	return hours ? `${hours}h ${time}` : time;
}

export default command({
	name: "marker",
	description: "Add a stream marker at the current timestamp",
	permission: "mod",
	args: [
		{
			type: "text",
			name: "description",
			optional: true,
		},
	],
	errors: () => ({
		MAX_DESCRIPTION_LENGTH_EXCEEDED: DESCRIPTION_TOO_LONG,
		BROADCASTER_NOT_LIVE: CommandError.CHANNEL_MUST_BE_LIVE,
		ARCHIVES_DISABLED: "Markers require VOD archiving to be enabled for the channel.",
		VOD_NOT_READY: "The broadcast's VOD is not ready yet.",
	}),
	async exec(args, channel) {
		if (!channel.stream) {
			throw new CommandError(CommandError.CHANNEL_MUST_BE_LIVE);
		}

		if (args.description && args.description.length > 140) {
			throw new CommandError(DESCRIPTION_TOO_LONG);
		}

		const marker = await channel.createMarker(args.description);

		if (!marker) {
			throw new CommandError("The stream marker could not be created.");
		}

		const echo = args.description ? `: ${args.description}` : "";

		channel.chat.notice(
			`Stream marker created at ${formatPosition(Math.floor(marker.positionSeconds))}${echo}`,
		);
	},
});
