<script lang="ts">
	import NumberFlow from "@number-flow/svelte";
	import { app } from "$lib/app.svelte";
	import { useSidebar } from "$lib/hooks/use-sidebar.svelte";
	import { createChannelMenu } from "$lib/menus/channel-menu";
	import type { Channel } from "$lib/models/channel.svelte";
	import { openMenu } from "$lib/util";
	import ClockCountdown from "~icons/ph/clock-countdown";
	import PushPin from "~icons/ph/push-pin";
	import Users from "~icons/ph/users-bold";
	import Tooltip from "../ui/Tooltip.svelte";
	import GuestList from "./GuestList.svelte";
	import StreamInfo from "./StreamInfo.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const sidebar = useSidebar();
</script>

<Tooltip class="max-w-64" side="right" delay={0}>
	{#snippet trigger(register)}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative flex cursor-pointer items-center gap-2 p-2 transition-colors hover:bg-accent"
			onclick={async () => {
				await app.open(channel);
				app.history.pushChannel(channel.id);
			}}
			oncontextmenu={(event) => openMenu(event, () => createChannelMenu(channel))}
			{@attach register}
		>
			<StreamInfo {channel} />
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
			{#if !sidebar.collapsed}
				<div class="flex items-center gap-1">
					{@render indicators()}

					<div
						class="overflow-hidden text-ellipsis whitespace-nowrap text-twitch dark:text-twitch-link"
					>
						{channel.user.displayName} &bullet; {channel.stream.game}
					</div>
				</div>
			{/if}

			<p class="line-clamp-2">{channel.stream.title}</p>

			{#if !sidebar.collapsed}
				<div class="flex items-center text-red-500 dark:text-red-400">
					<Users class="mr-1 size-3" />

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
