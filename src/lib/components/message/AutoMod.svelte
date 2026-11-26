<script lang="ts">
	import type { AutoModMetadata } from "#lib/models/message/user-message.svelte.js";
	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import { deletedAppearance } from "#lib/settings.js";

	import Button from "../ui/Button.svelte";
	import Callout from "./Callout.svelte";
	import Message from "./Message.svelte";

	interface Props {
		message: UserMessage;
		metadata: AutoModMetadata;
	}

	const { message, metadata }: Props = $props();
</script>

<Callout class="automod border-danger" data-deleted={deletedAppearance(message)}>
	<div class="automod-header mb-2 flex w-full items-start justify-between gap-x-4">
		<div>
			<img
				class="inline align-middle"
				src="https://static-cdn.jtvnw.net/badges/v1/df9095f6-a8a0-4cc2-bb33-d908c0adffb8/3"
				alt="AutoMod"
				width="18"
				height="18"
			/>

			<span class="font-semibold text-fg">AutoMod</span>:

			{#if metadata.reason === "blocked-term"}
				Message held for using blocked terms
			{:else if metadata.category === "smartdetection"}
				Message held by smart detection (Level {metadata.level})
			{:else}
				Message held for {metadata.category} (Level {metadata.level})
			{/if}
		</div>

		<div class="automod-actions flex gap-x-4">
			<Button
				class="text-success"
				variant="inline"
				disabled={message.deleted}
				onclick={() => message.allow()}
			>
				Allow
			</Button>

			<Button
				class="text-danger"
				variant="inline"
				disabled={message.deleted}
				onclick={() => message.deny()}
			>
				Deny
			</Button>
		</div>
	</div>

	<Message {message} />
</Callout>
