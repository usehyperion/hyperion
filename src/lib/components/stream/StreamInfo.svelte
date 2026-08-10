<script lang="ts">
	import { useSidebar } from "$lib/hooks/use-sidebar.svelte";
	import type { Channel } from "$lib/models/channel.svelte";
	import DotsThreeCircle from "~icons/ph/dots-three-circle";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const sidebar = useSidebar();
</script>

<img
	class={[
		"ease size-8 rounded-full object-cover ring-1 ring-black/10 transition-opacity duration-200 dark:ring-white/10",
		sidebar.collapsed && "opacity-0",
		!channel.stream && "grayscale",
	]}
	src={channel.user.avatarUrl}
	alt={channel.user.displayName}
	width="150"
	height="150"
	draggable="false"
/>

{#if !sidebar.collapsed && channel.stream?.guests.size}
	<div
		class="absolute right-1 bottom-1 flex items-center justify-center rounded-full bg-muted/70"
	>
		<DotsThreeCircle class="size-5" />
	</div>
{/if}
