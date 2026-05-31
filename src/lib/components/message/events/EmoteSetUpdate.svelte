<script lang="ts">
	import type { Emote as EmoteType } from "$lib/emotes";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";
	import Emote from "../../Emote.svelte";

	interface Props {
		action: "added" | "removed" | "renamed";
		oldName?: string;
		emote: EmoteType;
		actor: Viewer;
	}

	const { action, oldName, emote, actor }: Props = $props();
</script>

{@html colorizeName(actor)}

{#if action === "renamed"}
	renamed <span class="font-medium text-foreground">{oldName}</span> to
	<span class="font-medium text-foreground">{emote.name}</span>
{:else}
	{action} an emote:
	<span class="font-medium text-foreground">{emote.name}</span>
{/if}

<Emote {emote} />
