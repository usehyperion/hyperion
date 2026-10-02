<script lang="ts">
	import type { User } from "#lib/models/user.svelte.js";
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		user: User;
		moderator: Viewer;
	}

	const { user, moderator }: Props = $props();
</script>

<Username user={moderator.user} /> canceled the raid on <Username {user} />.
