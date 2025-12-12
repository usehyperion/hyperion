<script lang="ts">
	import DotsThreeCircle from "~icons/ph/dots-three-circle";
	import Users from "~icons/ph/users-bold";
	import { getSidebarContext } from "$lib/context";
	import type { Channel } from "$lib/models/channel.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const sidebar = getSidebarContext();

	function formatViewers(viewers: number) {
		if (viewers >= 1000) {
			return `${(viewers / 1000).toFixed(1)}K`;
		}

		return viewers.toString();
	}
</script>

<img
	class={["size-8 rounded-full object-cover", !channel.stream && "grayscale"]}
	src={channel.user.avatarUrl}
	alt={channel.user.displayName}
	width="150"
	height="150"
	draggable="false"
/>

{#if sidebar.collapsed && channel.stream?.guests.size}
	<div
		class="bg-muted/70 absolute right-1 bottom-1 flex items-center justify-center rounded-full"
	>
		<DotsThreeCircle class="size-5" />
	</div>
{/if}

{#if !sidebar.collapsed}
	{#if channel.stream}
		<div class="min-w-0 flex-1">
			<div class="flex items-center justify-between">
				<div
					class="text-sidebar-foreground flex items-center gap-x-1 truncate text-sm font-medium"
				>
					{channel.user.displayName}

					{#if channel.stream.guests.size}
						<span class="text-xs">+{channel.stream.guests.size}</span>
					{/if}
				</div>

				<div class="flex items-center gap-1 text-xs font-medium text-red-400">
					<Users />
					{formatViewers(channel.stream.viewers)}
				</div>
			</div>

			<p class="text-muted-foreground truncate text-xs">
				{channel.stream.game}
			</p>
		</div>
	{:else}
		<span class="text-muted-foreground truncate text-sm font-medium">
			{channel.user.displayName}
		</span>
	{/if}
{/if}
