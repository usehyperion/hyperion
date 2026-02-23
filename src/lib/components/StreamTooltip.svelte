<script lang="ts">
	import Users from "~icons/ph/users-bold";
	import { resolve } from "$app/paths";
	import { getSidebarContext } from "$lib/context";
	import { createChannelMenu } from "$lib/menus/channel-menu";
	import type { Channel } from "$lib/models/channel.svelte";
	import { openMenu } from "$lib/util";
	import GuestList from "./GuestList.svelte";
	import StreamInfo from "./StreamInfo.svelte";
	import * as Tooltip from "./ui/tooltip";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const sidebar = getSidebarContext();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<div
				{...props}
				class="hover:bg-accent relative flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition-colors"
				oncontextmenu={(event) => openMenu(event, () => createChannelMenu(channel))}
			>
				<a
					class="pointer-events-none absolute inset-0 z-10"
					href={resolve("/(main)/channels/[username]", {
						username: channel.user.username,
					})}
					draggable="false"
					aria-label="Join {channel.user.displayName}"
					data-sveltekit-preload-data="off"
				>
				</a>

				<StreamInfo {channel} />
			</div>
		{/snippet}
	</Tooltip.Trigger>

	<Tooltip.Content
		class={["max-w-64", !sidebar.collapsed && !channel.stream && "hidden"]}
		side="right"
		sideOffset={8}
	>
		{#if channel.stream}
			<div class="space-y-0.5">
				{#if sidebar.collapsed}
					<div
						class="dark:text-twitch text-twitch-link overflow-hidden overflow-ellipsis whitespace-nowrap"
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
	</Tooltip.Content>
</Tooltip.Root>
