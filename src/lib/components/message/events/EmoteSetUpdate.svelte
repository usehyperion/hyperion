<script lang="ts">
	import type { Emote as EmoteType } from "#lib/emotes.js";
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Emote from "#lib/components/emote/Emote.svelte";
	import Username from "#lib/components/user/Username.svelte";

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
	renamed <span class="font-medium text-fg">{oldName}</span> to
	<span class="font-medium text-fg">{emote.displayName}</span>
{:else}
	{action} an emote:
	<span class="font-medium text-fg">{emote.displayName}</span>
{/if}

<Emote {emote} />
