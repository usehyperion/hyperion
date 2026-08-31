<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { User } from "$lib/models/user.svelte";

	interface Props {
		blocked: boolean;
		user: User;
	}

	const { blocked, user }: Props = $props();
</script>

{blocked ? "Blocked" : "Unblocked"}
<Username {user} />
