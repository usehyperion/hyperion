<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type { UnbanRequestCreate, UnbanRequestUpdate } from "$lib/twitch/pubsub";

	interface Props {
		request: UnbanRequestCreate | UnbanRequestUpdate;
		viewer: Viewer;
		moderator?: Viewer;
	}

	const { request, viewer, moderator }: Props = $props();
</script>

{#if "status" in request}
	{@const status = request.status.toLowerCase()}

	{#if !moderator}
		<Username user={viewer.user} />'s unban request was {status}.
	{:else}
		<Username user={moderator.user} />
		{status}
		<Username user={viewer.user} />'s unban request{request.resolver_message
			? `: ${request.resolver_message}`
			: "."}
	{/if}
{:else}
	<Username user={viewer.user} /> submitted an unban request: {request.requester_message}
{/if}
