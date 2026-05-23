<script lang="ts">
	import type { Snippet } from "svelte";
	import { Separator } from "../ui/separator";

	interface Props {
		children: Snippet;
		class?: string;
	}

	const { children, class: className }: Props = $props();
</script>

<div class={["relative px-3.5", className]}>
	<Separator class="my-4 bg-current" />

	<div
		class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs font-semibold uppercase"
	>
		{@render children()}
	</div>
</div>
