<script lang="ts">
	import type { EventMessage } from "$lib/models/message/event-message";
	import Timestamp from "../Timestamp.svelte";

	interface Props {
		message: EventMessage;
	}

	const { message }: Props = $props();
</script>

<div
	class="px-3 py-2 text-muted-foreground aria-disabled:opacity-50"
	aria-disabled={message.deleted}
>
	<Timestamp date={message.timestamp} />

	<p class="inline">
		<message.component {...message.props} />
	</p>
</div>
