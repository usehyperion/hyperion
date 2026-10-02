<script lang="ts">
	import type { User } from "#lib/models/user.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		blocked: boolean;
		user: User;
	}

	const { blocked, user }: Props = $props();
</script>

{blocked ? "Blocked" : "Unblocked"}
<Username {user} />
