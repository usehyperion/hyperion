<script lang="ts">
	import { useSidebar } from "$lib/hooks/use-sidebar.svelte";
	import type { Channel } from "$lib/models/channel.svelte";
	import DotsThreeCircle from "~icons/ph/dots-three-circle";
	import Users from "~icons/ph/users-bold";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const sidebar = useSidebar();

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
		class="absolute right-1 bottom-1 flex items-center justify-center rounded-full bg-muted/70"
	>
		<DotsThreeCircle class="size-5" />
	</div>
{/if}

{#if !sidebar.collapsed}
	{#if channel.stream}
		<div class="min-w-0 flex-1">
			<div class="flex items-center justify-between">
				<div
					class="flex items-center gap-x-1 truncate text-sm font-medium text-sidebar-foreground"
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

			<p class="truncate text-xs text-muted-foreground">
				{channel.stream.game}
			</p>
		</div>
	{:else}
		<span class="truncate text-sm font-medium text-muted-foreground">
			{channel.user.displayName}
		</span>
	{/if}
{/if}
