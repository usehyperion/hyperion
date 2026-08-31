<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type {
		ChannelUnbanRequestCreate,
		ChannelUnbanRequestResolve,
	} from "$lib/twitch/eventsub";

	interface Props {
		request: ChannelUnbanRequestCreate | ChannelUnbanRequestResolve;
		viewer: Viewer;
		moderator?: Viewer;
	}

	const { request, viewer, moderator }: Props = $props();
</script>

{#if "status" in request}
	{#if !moderator}
		<Username user={viewer.user} />'s unban request was {request.status}.
	{:else}
		<Username user={moderator.user} />
		{request.status}
		<Username user={viewer.user} />'s unban request{request.resolution_text
			? `: ${request.resolution_text}`
			: "."}
	{/if}
{:else}
	<Username user={viewer.user} /> submitted an unban request: {request.text}
{/if}
