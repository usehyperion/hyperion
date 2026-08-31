<script lang="ts">
	import Emote from "$lib/components/Emote.svelte";
	import Username from "$lib/components/user/Username.svelte";
	import type { Emote as EmoteType } from "$lib/emotes";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		action: "added" | "removed" | "renamed";
		oldName?: string;
		emote: EmoteType;
		actor: Viewer;
	}

	const { action, oldName, emote, actor }: Props = $props();
</script>

<Username user={actor.user} />

{#if action === "renamed"}
	renamed <span class="font-medium text-foreground">{oldName}</span> to
	<span class="font-medium text-foreground">{emote.displayName}</span>
{:else}
	{action} an emote:
	<span class="font-medium text-foreground">{emote.displayName}</span>
{/if}

<Emote {emote} />
