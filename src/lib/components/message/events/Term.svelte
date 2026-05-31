<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type { AutoModTermsMetadata } from "$lib/twitch/eventsub";
	import { colorizeName } from "$lib/util";

	interface Props {
		data: AutoModTermsMetadata;
		moderator: Viewer;
	}

	const { data, moderator }: Props = $props();

	const via = $derived(data.from_automod ? " (via AutoMod)" : "");
</script>

{@html colorizeName(moderator)}
{data.action === "add" ? "added" : "removed"}

{#if data.terms.length === 1}
	a {data.list} term{via}: {data.terms[0]}
{:else}
	{data.terms.length} {data.list} terms{via}: {data.terms.join(", ")}
{/if}
