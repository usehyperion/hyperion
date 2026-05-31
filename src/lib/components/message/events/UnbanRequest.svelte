<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type {
		ChannelUnbanRequestCreate,
		ChannelUnbanRequestResolve,
	} from "$lib/twitch/eventsub";
	import { colorizeName } from "$lib/util";

	interface Props {
		request: ChannelUnbanRequestCreate | ChannelUnbanRequestResolve;
		viewer: Viewer;
		moderator?: Viewer;
	}

	const { request, viewer, moderator }: Props = $props();

	const target = $derived(colorizeName(viewer));
</script>

{#if "status" in request}
	{#if !moderator}
		{@html target}'s unban request was {request.status}.
	{:else}
		{@html colorizeName(moderator)}
		{request.status}
		{@html target}'s unban request{request.resolution_text
			? `: ${request.resolution_text}`
			: "."}
	{/if}
{:else}
	{@html target} submitted an unban request: {request.text}
{/if}
