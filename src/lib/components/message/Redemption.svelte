<script lang="ts">
	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";
	import type { ChannelPointReward } from "#lib/twitch/pubsub.js";

	import Username from "../user/Username.svelte";
	import Callout from "./Callout.svelte";
	import Message from "./Message.svelte";

	interface Props {
		reward: ChannelPointReward;
		message: UserMessage;
	}

	const { reward, message }: Props = $props();
</script>

<Callout color={reward.background_color}>
	<p>
		<Username user={message.viewer.user} />
		used <span class="font-medium">{reward.cost}</span> channel points to redeem
		<span class="font-medium">{reward.title}</span>
	</p>

	<div class="mt-2">
		<Message {message} />
	</div>
</Callout>
