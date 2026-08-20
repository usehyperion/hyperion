<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { detached, registry, type TooltipOptions } from "./TooltipLayer.svelte";

	interface Props extends TooltipOptions {
		children: Snippet;
		trigger: Snippet<[register: Attachment<HTMLElement>]>;
	}

	const { children, trigger, ...rest }: Props = $props();

	function register(node: HTMLElement) {
		node.dataset.slot = "tooltip-trigger";
		registry.set(node, { content: children, ...rest });

		return () => {
			node.removeAttribute("data-slot");
			registry.delete(node);

			for (const listener of detached) {
				listener(node);
			}
		};
	}
</script>

{@render trigger(register)}
