<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		action: "add" | "delete";
		list: "blocked" | "permitted";
		text: string;
		fromAutoMod: boolean;
		moderator: Viewer;
	}

	const { action, list, text, fromAutoMod, moderator }: Props = $props();
</script>

<Username user={moderator.user} />
{action === "add" ? "added" : "deleted"}
a {list} term{fromAutoMod ? " (via AutoMod)" : ""}: {text}
