<script lang="ts">
	import { Tooltip } from "bits-ui";

	import type { Emote as EmoteType } from "#lib/emotes.js";
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Emote from "#lib/components/Emote.svelte";
	import EmoteTooltip, { type EmotePayload } from "#lib/components/EmoteTooltip.svelte";
	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		action: "added" | "removed" | "renamed";
		oldName?: string;
		emote: EmoteType;
		actor: Viewer;
	}

	const { action, oldName, emote, actor }: Props = $props();

	const emoteTether = Tooltip.createTether<EmotePayload>();
</script>

<Username user={actor.user} />

{#if action === "renamed"}
	renamed <span class="font-medium text-foreground">{oldName}</span> to
	<span class="font-medium text-foreground">{emote.displayName}</span>
{:else}
	{action} an emote:
	<span class="font-medium text-foreground">{emote.displayName}</span>
{/if}

<Emote {emote} tether={emoteTether} />
<EmoteTooltip tether={emoteTether} />
