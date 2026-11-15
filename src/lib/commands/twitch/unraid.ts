import { command } from "../define";

const NO_PENDING_RAID = "The channel does not have a pending raid to cancel.";

export default command({
	name: "unraid",
	description: "Stop an ongoing raid",
	permission: "mod",
	errors: () => ({
		RAID_DOES_NOT_EXIST: NO_PENDING_RAID,
		NO_ACTIVE_RAID: NO_PENDING_RAID,
	}),
	async exec(_, channel) {
		await channel.cancelRaid();
	},
});
