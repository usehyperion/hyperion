<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";
	import type { ChannelPointReward } from "#lib/twitch/pubsub.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		reward: ChannelPointReward;
		viewer: Viewer;
	}

	const { reward, viewer }: Props = $props();
</script>

<span class="mr-1 inline-block size-2 rounded-full" style:background-color={reward.background_color}
></span>
<Username user={viewer.user} /> used <span class="font-medium">{reward.cost}</span> channel points
to redeem <span class="font-medium">{reward.title}</span>.
