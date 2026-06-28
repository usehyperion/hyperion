<script lang="ts">
	import { app } from "$lib/app.svelte";
	import { createChannelMenu } from "$lib/menus/channel-menu";
	import type { Channel } from "$lib/models/channel.svelte";
	import { openMenu } from "$lib/util";
	import Users from "~icons/ph/users-bold";
	import Tooltip from "../ui/Tooltip.svelte";
	import GuestList from "./GuestList.svelte";
	import StreamInfo from "./StreamInfo.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent"
	onclick={async () => {
		await app.open(channel);
		app.history.pushChannel(channel.id);
	}}
	oncontextmenu={(event) => openMenu(event, () => createChannelMenu(channel))}
	data-slot="tooltip-trigger"
>
	<StreamInfo {channel} />
</div>

<Tooltip class={["max-w-64", !app.sidebarCollapsed && !channel.stream && "hidden"]} side="right">
	{#if channel.stream}
		<div class="space-y-0.5">
			{#if app.sidebarCollapsed}
				<div
					class="overflow-hidden text-ellipsis whitespace-nowrap text-twitch-link dark:text-twitch"
				>
					{channel.user.displayName} &bullet; {channel.stream.game}
				</div>
			{/if}

			<p class="line-clamp-2">{channel.stream.title}</p>

			{#if app.sidebarCollapsed}
				<div class="flex items-center text-red-400 dark:text-red-500">
					<Users class="mr-1 size-3" />

					<p class="text-xs">
						{channel.stream.viewers} viewers
					</p>
				</div>
			{/if}

			{#if channel.stream.guests.size}
				<GuestList {channel} tooltip />
			{/if}
		</div>
	{:else if app.sidebarCollapsed}
		{channel.user.displayName}
	{/if}
</Tooltip>
