<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/util";

	interface Props {
		children: Snippet;
		class?: string;
	}

	const { children, class: className }: Props = $props();
</script>

<div
	class={cn(
		"relative flex h-4 w-full items-center gap-2 px-2 text-muted-foreground",
		"before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-current/80",
		"after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-current/80",
		className,
	)}
	role="separator"
	data-slot="chat-separator"
>
	<span class="min-w-0 flex-none text-center text-xs font-medium wrap-break-word uppercase">
		{@render children()}
	</span>
</div>
