<script lang="ts">
	import { Tooltip } from "bits-ui";
	import type { Snippet } from "svelte";

	interface Props extends Tooltip.ContentProps {
		delay?: number;
		children: Snippet;
		trigger: Snippet<[props: Record<string, unknown>]>;
	}

	const { delay, children, trigger, ...rest }: Props = $props();
</script>

<Tooltip.Root delayDuration={delay}>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			{@render trigger(props)}
		{/snippet}
	</Tooltip.Trigger>

	<Tooltip.Portal>
		<Tooltip.Content sideOffset={6} {...rest}>
			<Tooltip.Arrow class="text-neutral-800" />

			{@render children()}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
