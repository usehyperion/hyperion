<script lang="ts">
	import XCircle from "~icons/ph/x-circle";

	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import Message from "../message/Message.svelte";

	interface Props {
		target: UserMessage;
		oncancel: () => void;
	}

	const { target, oncancel }: Props = $props();
</script>

<div
	class="rounded-t-md border border-b-0 border-muted bg-muted/50 px-3 pt-1.5 pb-2.5 text-sm transition-colors duration-200 has-[+div>input:focus-visible]:border-input"
	data-component="chat-reply"
>
	<div class="flex items-center justify-between" data-slot="chat-reply-header">
		<span class="text-muted-foreground" data-slot="chat-reply-label">Replying to:</span>

		<button
			type="button"
			aria-label="Cancel reply"
			data-slot="chat-reply-cancel"
			onclick={oncancel}
		>
			<XCircle
				class="block text-muted-foreground transition-colors duration-150 hover:text-foreground"
			/>
		</button>
	</div>

	<div class="mt-2" data-slot="chat-reply-preview">
		<Message message={target} />
	</div>
</div>
