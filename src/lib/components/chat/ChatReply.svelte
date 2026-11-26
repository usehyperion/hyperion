<script lang="ts">
	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import { IconCancelReply } from "#lib/icons.js";

	import Message from "../message/Message.svelte";

	interface Props {
		target: UserMessage;
		oncancel: () => void;
	}

	const { target, oncancel }: Props = $props();
</script>

<div
	class="rounded-t-md border border-b-0 border-line bg-tint px-3 pt-1.5 pb-2.5 text-body transition-colors duration-200 has-[+div>input:focus-visible]:border-line-strong"
>
	<div class="flex items-center justify-between">
		<span class="text-fg-muted">Replying to:</span>

		<button type="button" aria-label="Cancel reply" onclick={oncancel}>
			<IconCancelReply
				class="block text-fg-muted transition-colors duration-150 hover:text-fg"
			/>
		</button>
	</div>

	<div class="mt-2">
		<Message message={target} />
	</div>
</div>
