<script lang="ts">
	import type { AutoModMetadata } from "$lib/models/message/user-message.svelte";
	import { UserMessage } from "$lib/models/message/user-message.svelte";
	import { settings } from "$lib/settings";

	import Button from "../ui/Button.svelte";
	import Message from "./Message.svelte";

	interface Props {
		message: UserMessage;
		metadata: AutoModMetadata;
	}

	const { message, metadata }: Props = $props();
</script>

<div
	class="my-0.5 border-l-4 border-red-500 bg-muted/50 p-2"
	data-deleted={message.deleted ? settings.state["moderation.deleted.appearance"] : undefined}
>
	<div class="mb-2 flex w-full items-start justify-between gap-x-4">
		<div>
			<img
				class="inline align-middle"
				src="https://static-cdn.jtvnw.net/badges/v1/df9095f6-a8a0-4cc2-bb33-d908c0adffb8/3"
				alt="AutoMod"
				width="18"
				height="18"
			/>

			<span class="font-semibold text-twitch">AutoMod</span>: Message held {metadata.category}
			{Number.isNaN(metadata.level) ? null : `(Level ${metadata.level})`}
		</div>

		<div class="flex gap-x-4">
			<Button
				class="text-green-400"
				variant="inline"
				disabled={message.deleted}
				onclick={() => message.allow()}
			>
				Allow
			</Button>

			<Button
				class="text-destructive"
				variant="inline"
				disabled={message.deleted}
				onclick={() => message.deny()}
			>
				Deny
			</Button>
		</div>
	</div>

	<Message {message} />
</div>
