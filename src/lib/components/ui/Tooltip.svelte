<script lang="ts">
	import { Tooltip } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn } from "tailwind-variants";

	interface Props extends Tooltip.ContentProps {
		delay?: number;
		children: Snippet;
		trigger: Snippet<[props: Record<string, unknown>]>;
	}

	const { class: className, delay, children, trigger, ...rest }: Props = $props();
</script>

<Tooltip.Root delayDuration={delay}>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			{@render trigger(props)}
		{/snippet}
	</Tooltip.Trigger>

	<Tooltip.Portal>
		<Tooltip.Content
			class={cn(
				"w-max rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-primary",
				"smooth-shadow-ring-md",
				className,
			)}
			sideOffset={6}
			{...rest}
		>
			<Tooltip.Arrow class="text-neutral-800" />

			{@render children()}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
