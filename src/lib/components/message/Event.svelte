<script lang="ts" module>
	import type { Component } from "svelte";

	import AutoMod from "./events/AutoMod.svelte";
	import Banned from "./events/Banned.svelte";
	import BanStatus from "./events/BanStatus.svelte";
	import BlockStatus from "./events/BlockStatus.svelte";
	import Clear from "./events/Clear.svelte";
	import Delete from "./events/Delete.svelte";
	import EmoteSetChange from "./events/EmoteSetChange.svelte";
	import EmoteSetUpdate from "./events/EmoteSetUpdate.svelte";
	import Join from "./events/Join.svelte";
	import Mode from "./events/Mode.svelte";
	import Notice from "./events/Notice.svelte";
	import Raid from "./events/Raid.svelte";
	import RoleStatus from "./events/RoleStatus.svelte";
	import StreamStatus from "./events/StreamStatus.svelte";
	import SuspicionStatus from "./events/SuspicionStatus.svelte";
	import Term from "./events/Term.svelte";
	import Timeout from "./events/Timeout.svelte";
	import UnbanRequest from "./events/UnbanRequest.svelte";
	import Unraid from "./events/Unraid.svelte";
	import Untimeout from "./events/Untimeout.svelte";
	import Warn from "./events/Warn.svelte";
	import WarnAck from "./events/WarnAck.svelte";

	const EVENT_TYPES = new Map<Component<any>, string>([
		[AutoMod, "automod"],
		[Banned, "banned"],
		[BanStatus, "ban-status"],
		[BlockStatus, "block-status"],
		[Clear, "clear"],
		[Delete, "delete"],
		[EmoteSetChange, "emote-set-change"],
		[EmoteSetUpdate, "emote-set-update"],
		[Join, "join"],
		[Mode, "mode"],
		[Notice, "notice"],
		[Raid, "raid"],
		[RoleStatus, "role-status"],
		[StreamStatus, "stream-status"],
		[SuspicionStatus, "suspicion-status"],
		[Term, "term"],
		[Timeout, "timeout"],
		[UnbanRequest, "unban-request"],
		[Unraid, "unraid"],
		[Untimeout, "untimeout"],
		[Warn, "warn"],
		[WarnAck, "warn-ack"],
	]);
</script>

<script lang="ts">
	import type { EventMessage } from "#lib/models/message/event-message.js";

	import Timestamp from "../Timestamp.svelte";

	interface Props {
		message: EventMessage;
	}

	const { message }: Props = $props();
</script>

{#if message.bare}
	<message.component {...message.props} />
{:else}
	<div
		class="event px-3 py-2 text-fg-muted aria-disabled:opacity-50"
		aria-disabled={message.deleted}
		data-type={EVENT_TYPES.get(message.component)}
	>
		<Timestamp date={message.timestamp} />

		<p class="inline">
			<message.component {...message.props} />
		</p>
	</div>
{/if}
