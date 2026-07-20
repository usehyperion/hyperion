<script lang="ts">
	import type { UserMessage } from "$lib/models/message/user-message.svelte";
	import XCircle from "~icons/ph/x-circle";
	import Message from "../message/Message.svelte";

	interface Props {
		target: UserMessage;
		oncancel: () => void;
	}

	const { target, oncancel }: Props = $props();
</script>

<div
	class="rounded-t-md border border-b-0 border-muted bg-muted/50 px-3 pt-1.5 pb-2.5 text-sm transition-colors duration-200 has-[+div>input:focus-visible]:border-input"
>
	<div class="flex items-center justify-between">
		<span class="text-muted-foreground">Replying to:</span>

		<button type="button" aria-label="Cancel reply" onclick={oncancel}>
			<XCircle
				class="block text-muted-foreground transition-colors duration-150 hover:text-foreground"
			/>
		</button>
	</div>

	<div class="mt-2">
		<Message message={target} />
	</div>
</div>
