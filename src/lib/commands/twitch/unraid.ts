import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "unraid",
	description: "Stop an ongoing raid",
	modOnly: true,
	async exec(_, channel) {
		await mapErrors(
			() => channel.cancelRaid(),
			[
				{
					code: ["RAID_DOES_NOT_EXIST", "NO_ACTIVE_RAID"],
					message: ErrorMessage.NO_PENDING_RAID,
				},
			],
			ErrorMessage.COMMAND_FAILED,
		);
	},
});
