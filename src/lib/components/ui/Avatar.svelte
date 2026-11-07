<script lang="ts">
	import type { HTMLImgAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";

	const { class: className, ...rest }: HTMLImgAttributes = $props();
</script>

<img
	class={cn("rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10", className)}
	{...rest}
/>
