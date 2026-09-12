// @ts-nocheck migration

import { app } from "$lib/app.svelte";
import BanStatus from "$lib/components/message/events/BanStatus.svelte";
import Delete from "$lib/components/message/events/Delete.svelte";
import RoleStatus from "$lib/components/message/events/RoleStatus.svelte";
import Timeout from "$lib/components/message/events/Timeout.svelte";
import Untimeout from "$lib/components/message/events/Untimeout.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.moderate",
	async handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		const { chat } = channel;
		const moderator = await channel.viewers.fetch(data.moderator_user_id);

		switch (data.action) {
			case "delete":
			case "shared_chat_delete": {
				const metadata = data.action === "delete" ? data.delete : data.shared_chat_delete;
				const viewer = await channel.viewers.fetch(metadata.user_id);

				chat.event(Delete, {
					text: metadata.message_body,
					user: viewer.user,
					moderator,
				});

				break;
			}

			case "timeout":
			case "shared_chat_timeout": {
				const metadata =
					data.action === "timeout" ? data.timeout : data.shared_chat_timeout;
				const viewer = await channel.viewers.fetch(metadata.user_id);

				chat.deleteMessages(metadata.user_id);

				const expiration = new Date(metadata.expires_at);
				const duration = expiration.getTime() - Date.now();

				chat.event(Timeout, {
					seconds: Math.ceil(duration / 1000),
					reason: metadata.reason,
					viewer,
					moderator,
				});

				break;
			}

			case "untimeout":
			case "shared_chat_untimeout": {
				const metadata =
					data.action === "untimeout" ? data.untimeout : data.shared_chat_untimeout;
				const viewer = await channel.viewers.fetch(metadata.user_id);

				chat.event(Untimeout, { viewer, moderator });

				break;
			}

			case "ban":
			case "unban": {
				const isBan = data.action === "ban";
				const viewer = await channel.viewers.fetch((isBan ? data.ban : data.unban).user_id);

				if (isBan) {
					chat.deleteMessages(data.ban.user_id);
				}

				chat.event(BanStatus, {
					banned: isBan,
					reason: isBan ? data.ban.reason : null,
					viewer,
					moderator,
				});

				break;
			}

			case "shared_chat_ban":
			case "shared_chat_unban": {
				const isBan = data.action === "shared_chat_ban";
				const viewer = await channel.viewers.fetch(
					(isBan ? data.shared_chat_ban : data.shared_chat_unban).user_id,
				);

				if (isBan) {
					chat.deleteMessages(data.shared_chat_ban.user_id);
				}

				chat.event(BanStatus, {
					banned: isBan,
					reason: isBan ? data.shared_chat_ban.reason : null,
					viewer,
					moderator,
				});

				break;
			}

			case "mod":
			case "unmod": {
				const added = data.action === "mod";
				const viewer = await channel.viewers.fetch((added ? data.mod : data.unmod).user_id);

				chat.event(RoleStatus, { role: "moderator", added, viewer, moderator });

				break;
			}

			case "vip":
			case "unvip": {
				const added = data.action === "vip";
				const viewer = await channel.viewers.fetch((added ? data.vip : data.unvip).user_id);

				chat.event(RoleStatus, { role: "VIP", added, viewer, moderator });

				break;
			}

			default: {
				return;
			}
		}
	},
});
