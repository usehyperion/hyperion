<script lang="ts">
	import DotsThreeCircle from "~icons/ph/dots-three-circle";

	import type { Channel } from "#lib/models/channel.svelte.js";

	import { storage } from "#lib/stores.js";

	import Avatar from "../ui/Avatar.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

<Avatar
	class={[
		"ease size-8 transition-opacity duration-200",
		storage.state.sidebarCollapsed && "opacity-0",
		!channel.stream && "grayscale",
	]}
	src={channel.user.avatarUrl}
	alt={channel.user.displayName}
	width="150"
	height="150"
	draggable="false"
/>

{#if !storage.state.sidebarCollapsed && channel.stream?.guests.size}
	<div
		class="absolute right-1 bottom-1 flex items-center justify-center rounded-full bg-muted/70"
	>
		<DotsThreeCircle class="size-5" />
	</div>
{/if}
