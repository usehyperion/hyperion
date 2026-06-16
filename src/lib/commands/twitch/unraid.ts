import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "unraid",
	description: "Stop an ongoing raid",
	modOnly: true,
	async exec(_, channel) {
		await mapErrors(
			() => channel.unraid(),
			[{ status: 404, message: ErrorMessage.NO_PENDING_RAID }],
		);
	},
});
