import { app } from "#lib/app.svelte.js";
import { BADGE_SETS, Badge } from "#lib/models/badge.js";
import { twitchConnection } from "#lib/seventv.js";

import { defineHandler } from "../helper";

export default defineHandler("seventv", {
	name: "entitlement.create",
	handle(data) {
		const twitch = twitchConnection(data.user);
		if (!twitch) return;

		switch (data.kind) {
			case "BADGE": {
				const badge = app.badges.get(Badge.key(BADGE_SETS.seventv, data.ref_id));

				if (badge) {
					app.badges.give(twitch.id, badge);
				}

				break;
			}

			case "PAINT": {
				app.cosmetics.userPaints.set(twitch.id, app.cosmetics.paints.get(data.ref_id));
				break;
			}

			case "EMOTE_SET": {
				app.cosmetics.userPersonalSets.set(twitch.id, data.ref_id);
				break;
			}
		}
	},
});
