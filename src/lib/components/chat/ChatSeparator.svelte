<script lang="ts">
	import type { Snippet } from "svelte";

	import { cn } from "#lib/util/styles.js";

	interface Props {
		children: Snippet;
		class?: string;
	}

	const { children, class: className }: Props = $props();
</script>

<div
	class={cn(
		"chat-separator relative flex h-4 w-full items-center gap-2 px-2 text-fg-muted",
		"before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-current/80",
		"after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-current/80",
		className,
	)}
	role="separator"
	data-slot="chat-separator"
>
	<span class="min-w-0 flex-none text-center text-detail font-medium wrap-break-word uppercase">
		{@render children()}
	</span>
</div>
