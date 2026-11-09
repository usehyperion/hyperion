<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "tailwind-variants";

	import CaseSensitive from "~icons/local/case-sensitive";
	import Regex from "~icons/local/regex";
	import WholeWord from "~icons/local/whole-word";

	import type {
		HighlightConfig,
		HighlightType,
		KeywordHighlightConfig,
	} from "#lib/highlights.js";

	import { HIGHLIGHTS, KEYWORD_HIGHLIGHT } from "#lib/highlights.js";

	type Props = {
		children: Snippet;
		class?: string;
	} & (
		| {
				type: HighlightType;
				config: HighlightConfig;
				info?: string;
		  }
		| {
				type: "custom";
				config: KeywordHighlightConfig;
				info?: never;
		  }
	);

	const { children, class: className, type, config, info }: Props = $props();

	const decoration = $derived(type === "custom" ? KEYWORD_HIGHLIGHT : HIGHLIGHTS[type]);
</script>

{#if config.style === "background"}
	<div class={cn("bg-(--highlight)/30", className)} style:--highlight={config.color}>
		{@render children()}
	</div>
{:else if config.style === "default" || config.style === "compact"}
	<div
		class={cn("m-1 box-border overflow-hidden rounded-md border", className)}
		style:border-color={config.color}
	>
		{#if config.style === "default"}
			<div class="flex items-center bg-muted px-2.5 py-1.5 text-xs font-medium">
				<div class="flex items-center">
					<decoration.icon class="mr-2 size-4" />

					{decoration.label}

					{#if info}
						({info})
					{/if}
				</div>

				{#if type === "custom"}
					<div class="ml-auto flex items-center gap-2.5">
						{#if config.matchCase}
							<CaseSensitive class="size-4" />
						{/if}

						{#if config.wholeWord}
							<WholeWord class="size-4" />
						{/if}

						{#if config.regex}
							<Regex class="size-4" />
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{@render children()}
	</div>
{/if}
