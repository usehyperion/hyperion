<script lang="ts">
	import type {
		AutoModContext,
		BanStatusContext,
		ClearContext,
		DeleteContext,
		EmoteSetChangeContext,
		EmoteSetUpdateContext,
		MessageContext,
		ModeContext,
		RoleStatusContext,
		StreamStatusContext,
		SuspicionStatusContext,
		TermContext,
		TimeoutContext,
		UnbanRequestContext,
		WarnContext,
	} from "$lib/models/message/context";
	import type { SystemMessage } from "$lib/models/message/system-message";
	import { colorizeName, formatDuration } from "$lib/util";
	import Emote from "../Emote.svelte";
	import Timestamp from "../Timestamp.svelte";
	import { Button } from "../ui/button";

	interface Props {
		message: SystemMessage;
		context: MessageContext | null;
	}

	const { message, context: ctx }: Props = $props();

	const monitored = $derived(ctx?.type === "suspicionStatus" ? ctx.viewer.monitored : false);
	const restricted = $derived(ctx?.type === "suspicionStatus" ? ctx.viewer.restricted : false);

	const snippetMap = {
		autoMod,
		banned,
		banStatus,
		clear,
		delete: deleteMsg,
		emoteSetChange,
		emoteSetUpdate,
		mode,
		roleStatus,
		streamStatus,
		suspicionStatus,
		term,
		timeout,
		unbanRequest,
		warn,
	};
</script>

<div
	class="px-3 py-2 text-muted-foreground aria-disabled:opacity-50"
	aria-disabled={message.deleted}
>
	<Timestamp date={message.timestamp} />

	<p class="inline">
		{#if ctx}
			{#if ctx.type === "blockStatus"}
				{ctx.blocked ? "Blocked" : "Unblocked"} {@html colorizeName(ctx.user)}
			{:else if ctx.type === "join"}
				Joined {@html colorizeName(message.channel.user)}
			{:else if ctx.type === "raid"}
				{@html colorizeName(ctx.moderator)} is raiding {@html colorizeName(ctx.user)} with {@html ctx.viewers}
				viewers.
			{:else if ctx.type === "unraid"}
				{@html colorizeName(ctx.moderator)} canceled the raid on {@html colorizeName(
					ctx.user,
				)}.
			{:else if ctx.type === "untimeout"}
				{@html colorizeName(ctx.moderator)} removed timeout on {@html colorizeName(
					ctx.viewer,
				)}.
			{:else if ctx.type === "warnAck"}
				{@html colorizeName(ctx.viewer)} acknowledged their warning.
			{:else}
				{@render snippetMap[ctx.type](ctx as never)}
			{/if}
		{:else}
			{message.text}
		{/if}
	</p>
</div>

{#snippet autoMod(ctx: AutoModContext)}
	{@const target = colorizeName(ctx.viewer)}

	{#if ctx.status === "expired"}
		{@html target}'s message expired and was not shown in chat.
	{:else}
		{@html colorizeName(ctx.moderator)} {ctx.status} {@html target}'s message.
	{/if}
{/snippet}

{#snippet banned()}
	You are permanently banned from {@html colorizeName(message.channel.user)} and cannot send messages.
	If you have been unbanned, try
	<Button class="h-min p-0" variant="link" onclick={() => message.channel.rejoin()}>
		rejoining
	</Button>.
{/snippet}

{#snippet banStatus(ctx: BanStatusContext)}
	{@const target = colorizeName(ctx.viewer)}
	{@const action = ctx.banned ? "banned" : "unbanned"}

	{#if ctx.moderator}
		{@html colorizeName(ctx.moderator)} {action} {@html target}
	{:else}
		{@html target} has been {action}
	{/if}{ctx.reason ? `: ${ctx.reason}` : "."}
{/snippet}

{#snippet clear(ctx: ClearContext)}
	{#if ctx.moderator}
		{@html colorizeName(ctx.moderator)} cleared the chat
	{:else}
		The chat has been cleared
	{/if}

	for non-moderator viewers.
{/snippet}

{#snippet deleteMsg(ctx: DeleteContext)}
	{@const target = colorizeName(ctx.user)}

	{#if ctx.moderator}
		{@html colorizeName(ctx.moderator)} deleted {@html target}'s message: {ctx.text}
	{:else}
		{@html target}'s message was deleted: {ctx.text}
	{/if}
{/snippet}

{#snippet emoteSetChange(ctx: EmoteSetChangeContext)}
	{@html colorizeName(ctx.actor)}

	{#if ctx.name}
		changed the active emote set to
		<span class="font-medium text-foreground">{ctx.name}</span>.
	{:else}
		disabled the channel's emote set.
	{/if}
{/snippet}

{#snippet emoteSetUpdate(ctx: EmoteSetUpdateContext)}
	{@html colorizeName(ctx.actor)}

	{#if ctx.action === "renamed"}
		renamed <span class="font-medium text-foreground">{ctx.oldName}</span> to
		<span class="font-medium text-foreground">{ctx.emote.name}</span>
	{:else}
		{ctx.action} an emote:
		<span class="font-medium text-foreground">{ctx.emote.name}</span>
	{/if}

	<Emote emote={ctx.emote} />
{/snippet}

{#snippet mode(ctx: ModeContext)}
	{@html colorizeName(ctx.moderator)}
	{ctx.enabled ? "enabled" : "disabled"}
	{Number.isNaN(ctx.seconds) ? "" : formatDuration(ctx.seconds)}
	{ctx.mode === "slow" ? "slow mode." : `${ctx.mode} chat.`}
{/snippet}

{#snippet roleStatus(ctx: RoleStatusContext)}
	{@html colorizeName(ctx.moderator)}
	{ctx.added ? "added" : "removed"}
	{@html colorizeName(ctx.viewer)} as a {ctx.role}.
{/snippet}

{#snippet streamStatus(ctx: StreamStatusContext)}
	{@html colorizeName(message.channel.user)} is now {ctx.online ? "online" : "offline"}.
{/snippet}

{#snippet suspicionStatus(ctx: SuspicionStatusContext)}
	{@html colorizeName(ctx.moderator)}
	{ctx.active ? "started" : "stopped"}
	{monitored ? "monitoring" : restricted ? "restricting" : ctx.previous}
	{@html colorizeName(ctx.viewer)}'s messages.
{/snippet}

{#snippet term(ctx: TermContext)}
	{@const via = ctx.data.from_automod ? " (via AutoMod)" : ""}

	{@html colorizeName(ctx.moderator)}
	{ctx.data.action === "add" ? "added" : "removed"}

	{#if ctx.data.terms.length === 1}
		a {ctx.data.list} term{via}: {ctx.data.terms[0]}
	{:else}
		{ctx.data.terms.length} {ctx.data.list} terms{via}: {ctx.data.terms.join(", ")}
	{/if}
{/snippet}

{#snippet timeout(ctx: TimeoutContext)}
	{@const target = colorizeName(ctx.viewer)}
	{@const duration = formatDuration(ctx.seconds)}

	{#if ctx.moderator}
		{@html colorizeName(ctx.moderator)} timed out {@html target} for {duration}
	{:else}
		{@html target} has been timed out for {duration}
	{/if}{ctx.reason ? `: ${ctx.reason}` : "."}
{/snippet}

{#snippet unbanRequest(ctx: UnbanRequestContext)}
	{@const target = colorizeName(ctx.viewer)}

	{#if "status" in ctx.request}
		{#if !ctx.moderator}
			{@html target}'s unban request was {ctx.request.status}.
		{:else}
			{@html colorizeName(ctx.moderator)}
			{ctx.request.status}
			{@html target}'s unban request{ctx.request.resolution_text
				? `: ${ctx.request.resolution_text}`
				: "."}
		{/if}
	{:else}
		{@html target} submitted an unban request: {ctx.request.text}
	{/if}
{/snippet}

{#snippet warn(ctx: WarnContext)}
	{@const reasons = [ctx.warning.reason, ...(ctx.warning.chat_rules_cited ?? [])]
		.filter((r) => r !== null)
		.join(", ")}

	{@html colorizeName(ctx.moderator)} warned {@html colorizeName(ctx.viewer)}: {reasons}
{/snippet}
