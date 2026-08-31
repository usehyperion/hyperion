<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { User } from "$lib/models/user.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		user: User;
		moderator: Viewer;
	}

	const { user, moderator }: Props = $props();
</script>

<Username user={moderator.user} /> canceled the raid on <Username {user} />.
