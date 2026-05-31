<script lang="ts">
	import type { User } from "$lib/models/user.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		viewers: number;
		user: User;
		moderator: Viewer;
	}

	const { viewers, user, moderator }: Props = $props();
</script>

{@html colorizeName(moderator)} is raiding {@html colorizeName(user)} with {viewers} viewers.
