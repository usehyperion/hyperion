<script lang="ts">
	import type { User } from "$lib/models/user.svelte";

	interface Props {
		user: User;
	}

	const { user }: Props = $props();
</script>

<span class="font-semibold" style:color={user.color}>{user.displayName}</span>
