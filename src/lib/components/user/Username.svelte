<script lang="ts">
	import type { User } from "#lib/models/user.svelte.js";

	interface Props {
		user?: User;

		/**
		 * Shown instead when the user isn't known, e.g. when only their name is
		 * included in an event.
		 */
		name?: string;
	}

	const { user, name }: Props = $props();
</script>

<span class="font-semibold" style:color={user?.color}>{user?.displayName ?? name}</span>
