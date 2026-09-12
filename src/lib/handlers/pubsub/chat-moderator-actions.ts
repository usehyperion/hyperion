import { app } from "$lib/app.svelte";
import BanStatus from "$lib/components/message/events/BanStatus.svelte";
import Clear from "$lib/components/message/events/Clear.svelte";
import Delete from "$lib/components/message/events/Delete.svelte";
import Mode from "$lib/components/message/events/Mode.svelte";
import RoleStatus from "$lib/components/message/events/RoleStatus.svelte";
import Term from "$lib/components/message/events/Term.svelte";
import Timeout from "$lib/components/message/events/Timeout.svelte";
import Untimeout from "$lib/components/message/events/Untimeout.svelte";
import Warn from "$lib/components/message/events/Warn.svelte";
import WarnAck from "$lib/components/message/events/WarnAck.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "chat-moderator-actions",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const { chat } = channel;

		if (payload.type === "channel_terms_action") {
			const moderator = await channel.viewers.fetch(payload.data.requester_id);

			chat.event(Term, { term: payload.data, moderator });

			return;
		}

		const moderator = await channel.viewers.fetch(payload.data.created_by_user_id);

		if (payload.type === "moderator_added" || payload.type === "vip_added") {
			const viewer = await channel.viewers.fetch(payload.data.target_user_id);

			chat.event(RoleStatus, {
				role: payload.type === "moderator_added" ? "moderator" : "VIP",
				added: true,
				viewer,
				moderator,
			});

			return;
		}

		const action = payload.data;

		switch (action.moderation_action) {
			case "emoteonly":
			case "emoteonlyoff":
			case "r9kbeta":
			case "r9kbetaoff":
			case "subscribers":
			case "subscribersoff": {
				chat.event(Mode, {
					mode: action.moderation_action.startsWith("emote")
						? "emote-only"
						: action.moderation_action.startsWith("r9k")
							? "unique-mode"
							: "subscriber-only",
					enabled: !action.moderation_action.includes("off"),
					seconds: Number.NaN,
					moderator,
				});

				break;
			}

			case "followers":
			case "followersoff": {
				chat.event(Mode, {
					mode: "follower-only",
					enabled: action.moderation_action === "followers",
					seconds: action.args ? Number(action.args[0]) * 60 : Number.NaN,
					moderator,
				});

				break;
			}

			case "slow":
			case "slowoff": {
				chat.event(Mode, {
					mode: "slow",
					enabled: action.moderation_action === "slow",
					seconds: action.args ? Number(action.args[0]) : Number.NaN,
					moderator,
				});

				break;
			}

			case "clear": {
				chat.deleteMessages();
				chat.event(Clear, { moderator });

				break;
			}

			case "delete": {
				const viewer = await channel.viewers.fetch(action.target_user_id);

				chat.event(Delete, {
					text: action.args[1],
					user: viewer.user,
					moderator,
				});

				break;
			}

			case "timeout": {
				const viewer = await channel.viewers.fetch(action.target_user_id);

				chat.deleteMessages(action.target_user_id);

				chat.event(Timeout, {
					seconds: Number(action.args[1]),
					reason: action.args[2] || null,
					viewer,
					moderator,
				});

				break;
			}

			case "untimeout": {
				const viewer = await channel.viewers.fetch(action.target_user_id);

				chat.event(Untimeout, { viewer, moderator });

				break;
			}

			case "ban":
			case "unban": {
				const banned = action.moderation_action === "ban";
				const viewer = await channel.viewers.fetch(action.target_user_id);

				if (banned) {
					chat.deleteMessages(action.target_user_id);
				}

				chat.event(BanStatus, {
					banned,
					reason: (banned ? action.args[1] : null) || null,
					viewer,
					moderator,
				});

				break;
			}

			case "warn": {
				const viewer = await channel.viewers.fetch(action.target_user_id);

				chat.event(Warn, {
					reasons: action.args.slice(1),
					viewer,
					moderator,
				});

				break;
			}

			case "acknowledge_warning": {
				const viewer = await channel.viewers.fetch(action.target_user_id);

				chat.event(WarnAck, { viewer });

				break;
			}

			case "unmod": {
				const viewer = await channel.viewers.fetch(action.target_user_id);

				chat.event(RoleStatus, {
					role: "moderator",
					added: false,
					viewer,
					moderator,
				});

				break;
			}

			default: {
				return;
			}
		}
	},
});
