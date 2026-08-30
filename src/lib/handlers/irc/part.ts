import { log } from "$lib/log";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "part",
	handle(data) {
		log.info(`Left ${data.channel_login}`);
	},
});
