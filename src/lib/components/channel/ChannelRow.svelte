<script lang="ts">
	import NumberFlow from "@number-flow/svelte";

	import ClockCountdown from "~icons/ph/clock-countdown";
	import PushPin from "~icons/ph/push-pin";
	import Users from "~icons/ph/users-bold";

	import type { Channel } from "#lib/models/channel.svelte.js";

	import { app } from "#lib/app.svelte.js";
	import { createChannelMenu } from "#lib/menus/channel-menu.js";
	import { storage } from "#lib/stores.js";
	import { openMenu } from "#lib/util.js";

	import GuestList from "../stream/GuestList.svelte";
	import Tooltip from "../ui/Tooltip.svelte";
	import ChannelIcon from "./ChannelIcon.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

<Tooltip class="max-w-64" delay={0} side="right">
	{#snippet trigger(props)}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative flex cursor-pointer items-center gap-2 p-2 transition-colors hover:bg-accent"
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
		<PushPin />
	{/if}

	{#if channel.ephemeral}
		<ClockCountdown />
	{/if}
{/snippet}

{#snippet details()}
	{#if channel.stream}
		<div class="space-y-0.5">
			{#if !storage.state.sidebarCollapsed}
				<div class="flex items-center gap-1">
					{@render indicators()}

					<div
						class="overflow-hidden text-ellipsis whitespace-nowrap text-twitch dark:text-twitch-link"
					>
						{channel.user.displayName} &bullet; {channel.stream.game.name}
					</div>
				</div>
			{/if}

			<p class="line-clamp-2">{channel.stream.title}</p>

			{#if !storage.state.sidebarCollapsed}
				<div class="flex items-center text-red-500 dark:text-red-400">
					<Users class="mr-1 size-3" />

					<p class="text-xs">
						<NumberFlow class="tabular-nums" value={channel.stream.viewers} /> viewers
					</p>
				</div>
			{/if}

			{#if channel.stream.guests.size}
				<GuestList stream={channel.stream} tooltip />
			{/if}
		</div>
	{:else if !storage.state.sidebarCollapsed}
		<div class="flex items-center gap-1">
			{@render indicators()}
			{channel.user.displayName}
		</div>
	{/if}
{/snippet}
