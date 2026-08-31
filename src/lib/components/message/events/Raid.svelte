<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { User } from "$lib/models/user.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		viewers: number;
		user: User;
		moderator: Viewer;
	}

	const { viewers, user, moderator }: Props = $props();
</script>

<Username user={moderator.user} /> is raiding <Username {user} /> with {viewers} viewers.
