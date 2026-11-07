<script lang="ts">
	import type { User } from "#lib/models/user.svelte.js";

	interface Props {
		user?: User;
		name?: string;
	}

	const { user, name }: Props = $props();
</script>

<span class="font-semibold" style:color={user?.color}>{user?.displayName || name}</span>
