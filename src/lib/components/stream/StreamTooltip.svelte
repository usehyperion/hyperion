<script lang="ts">
	import NumberFlow from "@number-flow/svelte";

	import type { Channel } from "#lib/models/channel.svelte.js";

	import { app } from "#lib/app.svelte.js";
	import { useSidebar } from "#lib/hooks/use-sidebar.svelte.js";
	import { IconEphemeral, IconPin, IconViewers } from "#lib/icons.js";
	import { createChannelMenu } from "#lib/menus/channel-menu.js";
	import { openMenu } from "#lib/util/index.js";

	import ChannelIcon from "../channel/ChannelIcon.svelte";
	import Tooltip from "../ui/Tooltip.svelte";
	import GuestList from "./GuestList.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const sidebar = useSidebar();
</script>

<Tooltip class="max-w-64 px-2 py-1.5 text-xs" delay={0} side="right" sideOffset={4}>
	{#snippet trigger(props)}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative flex cursor-pointer items-center gap-2 p-2 transition-colors hover:bg-surface-3"
			{...props}
			onclick={() => app.open(channel)}
			oncontextmenu={(event) => openMenu(event, () => createChannelMenu(channel))}
		>
			<ChannelIcon {channel} />
		</div>
	{/snippet}

	{@render details()}
</Tooltip>

{#snippet indicators()}
	{#if channel.pinned}
		<IconPin />
	{/if}

	{#if channel.ephemeral}
		<IconEphemeral />
	{/if}
{/snippet}

{#snippet details()}
	{#if channel.stream}
		<div class="space-y-0.5">
			{#if !sidebar.collapsed}
				<div class="flex items-center gap-1">
					{@render indicators()}

					<div class="overflow-hidden text-ellipsis whitespace-nowrap text-accent">
						{channel.user.displayName} &bullet; {channel.stream.game.name}
					</div>
				</div>
			{/if}

			<p class="line-clamp-2">{channel.stream.title}</p>

			{#if !sidebar.collapsed}
				<div class="flex items-center text-danger">
					<IconViewers class="mr-1 size-3" />

					<p class="text-xs">
						<NumberFlow class="tabular-nums" value={channel.stream.viewers} /> viewers
					</p>
				</div>
			{/if}

			{#if channel.stream.guests.size}
				<GuestList {channel} tooltip />
			{/if}
		</div>
	{:else if !sidebar.collapsed}
		<div class="flex items-center gap-1">
			{@render indicators()}
			{channel.user.displayName}
		</div>
	{/if}
{/snippet}
