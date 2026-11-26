<script lang="ts">
	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import { MessageHistory } from "#lib/models/message-history.svelte.js";

	import UserCardBody from "./UserCardBody.svelte";

	interface Props {
		user: User;
		channel: Channel;
	}

	const { user, channel }: Props = $props();

	const viewer = $derived(channel.viewers.get(user.id));
	const history = $derived(viewer && new MessageHistory(viewer));
</script>

<div class="flex h-screen flex-col overflow-hidden bg-surface-1">
	<UserCardBody {user} {channel} {history} fill />
</div>
