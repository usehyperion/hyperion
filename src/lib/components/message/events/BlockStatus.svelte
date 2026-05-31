<script lang="ts">
	import type { User } from "$lib/models/user.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		blocked: boolean;
		user: User;
	}

	const { blocked, user }: Props = $props();
</script>

{blocked ? "Blocked" : "Unblocked"}
{@html colorizeName(user)}
