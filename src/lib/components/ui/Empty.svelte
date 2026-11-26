<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import type { HTMLAttributes, SvelteHTMLElements } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		icon?: Component<SvelteHTMLElements["svg"]>;
		title?: string;
		description?: string;
		media?: Snippet;
		header?: Snippet;
	}

	const {
		class: className,
		icon: Icon,
		title,
		description,
		media,
		header,
		children,
		...rest
	}: Props = $props();
</script>

<div
	class={cn(
		"flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-panel border-dashed border-line p-6 text-center text-balance",
		className,
	)}
	data-slot="empty"
	{...rest}
>
	{#if header}
		<div class="flex max-w-xs flex-col items-center gap-1" data-slot="empty-header">
			{@render header()}
		</div>
	{:else if title || description || media || Icon}
		<div class="flex max-w-xs flex-col items-center gap-1" data-slot="empty-header">
			{#if media}
				<div class="mb-1 flex shrink-0 items-center justify-center" data-slot="empty-media">
					{@render media()}
				</div>
			{:else if Icon}
				<div
					class="mb-1 flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-surface-2 text-fg-muted"
					data-slot="empty-icon"
				>
					<Icon class="size-4" aria-hidden="true" />
				</div>
			{/if}

			{#if title}
				<div class="text-ui font-medium text-fg" data-slot="empty-title">{title}</div>
			{/if}

			{#if description}
				<p class="text-2xs/relaxed text-fg-muted" data-slot="empty-description">
					{description}
				</p>
			{/if}
		</div>
	{/if}

	{#if children}
		<div
			class="flex w-full max-w-xs min-w-0 flex-col items-center gap-3 text-ui"
			data-slot="empty-content"
		>
			{@render children()}
		</div>
	{/if}
</div>
