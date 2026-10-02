<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";
	import type { ChannelTerm } from "#lib/twitch/pubsub.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		term: ChannelTerm;
		moderator: Viewer;
	}

	const { term, moderator }: Props = $props();

	const added = $derived(term.type.startsWith("add"));
	const list = $derived(term.type.includes("blocked") ? "blocked" : "permitted");
	const via = $derived(term.from_automod ? " (via AutoMod)" : "");
</script>

<Username user={moderator.user} />
{added ? "added" : "deleted"}
a {list} term{via}: {term.text}
