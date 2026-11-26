<script lang="ts">
	import type { PopoverController } from "@ui-sdk/svelte/popover";

	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import { MessageHistory } from "#lib/models/message-history.svelte.js";
	import { openPopout } from "#lib/popout.js";

	import Popover from "../ui/Popover.svelte";
	import UserCardBody from "./UserCardBody.svelte";
	import UserCardPopout from "./UserCardPopout.svelte";

	interface Props {
		controller: PopoverController;
		user: User;
		channel: Channel;
		anchor?: HTMLElement | null;
		onclose?: () => void;
	}

	const { controller, user, channel, anchor, onclose }: Props = $props();

	const viewer = $derived(channel.viewers.get(user.id));
	const history = $derived(viewer && new MessageHistory(viewer));

	function popout() {
		controller.close();

		openPopout(
			UserCardPopout,
			{ user, channel },
			{
				title: user.displayName,
				width: 400,
				height: 600,
				key: `user-card:${user.id}`,
			},
		);
	}
</script>

<Popover
	{controller}
	{anchor}
	class="w-sm overflow-hidden p-0"
	aria-label={user.displayName}
	onOpenChangeComplete={(open) => {
		if (!open) onclose?.();
	}}
>
	<UserCardBody {user} {channel} {history} onpopout={popout} />
</Popover>
