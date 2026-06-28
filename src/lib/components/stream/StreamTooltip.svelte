<script lang="ts">
	import { app } from "$lib/app.svelte";
	import { useSidebar } from "$lib/hooks/use-sidebar.svelte";
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

	const sidebar = useSidebar();
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

<Tooltip side="right">
	<div class={["max-w-64", !sidebar.collapsed && !channel.stream && "hidden"]}>
		{#if channel.stream}
			<div class="space-y-0.5">
				{#if sidebar.collapsed}
					<div
						class="overflow-hidden text-ellipsis whitespace-nowrap text-twitch-link dark:text-twitch"
					>
						{channel.user.displayName} &bullet; {channel.stream.game}
					</div>
				{/if}

				<p class="line-clamp-2">{channel.stream.title}</p>

				{#if sidebar.collapsed}
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
		{:else if sidebar.collapsed}
			{channel.user.displayName}
		{/if}
	</div>
</Tooltip>
