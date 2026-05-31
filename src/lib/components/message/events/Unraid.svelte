<script lang="ts">
	import type { User } from "$lib/models/user.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		user: User;
		moderator: Viewer;
	}

	const { user, moderator }: Props = $props();
</script>

{@html colorizeName(moderator)} canceled the raid on {@html colorizeName(user)}.
