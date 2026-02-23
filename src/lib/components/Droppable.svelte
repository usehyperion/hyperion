<script lang="ts">
	import { closestCorners } from "@dnd-kit/collision";
	import { createDroppable } from "@dnd-kit/svelte";
	import type { CreateDroppableInput } from "@dnd-kit/svelte";
	import type { Snippet } from "svelte";

	interface Props extends CreateDroppableInput {
		children: Snippet;
		class?: string;
	}

	const { children, class: className, ...rest }: Props = $props();

	const droppable = $derived(
		createDroppable({
			...rest,
			collisionDetector: closestCorners,
		}),
	);
</script>

<div class={className} {@attach droppable.attach}>
	{@render children()}
</div>
