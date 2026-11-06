import { command } from "../define";

export default command({
	name: "reload-cheermotes",
	description: "Reload cheermotes for the channel",
	async exec(_, channel) {
		await channel.cheermotes.fetch(true);

		channel.chat.notice("Reloaded cheermotes.");
	},
});
