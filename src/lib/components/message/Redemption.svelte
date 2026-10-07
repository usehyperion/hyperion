<script lang="ts">
	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";
	import type { Viewer } from "#lib/models/viewer.svelte.js";
	import type { ChannelPointReward } from "#lib/twitch/pubsub.js";

	import Username from "../user/Username.svelte";
	import Message from "./Message.svelte";

	interface Props {
		reward: ChannelPointReward | null;
		message?: UserMessage | null;
		viewer: Viewer | null;
	}

	const { reward, message, viewer }: Props = $props();
</script>

{#if reward}
	<div
		class="my-0.5 border-l-4 bg-muted/50 p-2"
		style:border-color={reward.background_color}
		data-component="redemption-message"
	>
		{#if viewer}
			<p data-slot="redemption-message-header">
				<Username user={viewer.user} />
				used <span class="font-medium">{reward.cost}</span> channel points to redeem
				<span class="font-medium">{reward.title}</span>
			</p>
		{/if}

		{#if reward.is_user_input_required && message}
			<div class="mt-2" data-slot="redemption-message-body">
				<Message {message} />
			</div>
		{/if}
	</div>
{/if}
