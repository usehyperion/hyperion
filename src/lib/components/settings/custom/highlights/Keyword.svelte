<script lang="ts">
	import CaseSensitive from "~icons/local/case-sensitive";
	import Regex from "~icons/local/regex";
	import WholeWord from "~icons/local/whole-word";

	import Button from "#lib/components/ui/Button.svelte";
	import Empty from "#lib/components/ui/Empty.svelte";
	import { KEYWORD_HIGHLIGHT } from "#lib/highlights.js";
	import { IconAdd, IconDelete, IconKeywordHighlight } from "#lib/icons.js";
	import { settings } from "#lib/settings.js";

	import Edit from "./Edit.svelte";
	import Row from "./Row.svelte";

	const keywords = $derived(settings.state["highlights.keywords"]);

	function add() {
		keywords.push({ ...KEYWORD_HIGHLIGHT.defaults });
	}
</script>

<div class="flex flex-col gap-2">
	{#if keywords.length === 0}
		<Empty
			class="border border-dashed py-8"
			icon={IconKeywordHighlight}
			title="No keyword triggers"
			description="Add a trigger to highlight messages containing specific words."
		/>
	{/if}

	{#each keywords as config, i (config)}
		<Row
			type="custom"
			id="keyword-{i}"
			label={config.pattern || "Empty pattern"}
			bind:config={keywords[i]}
		>
			{#snippet badges()}
				<div class="flex shrink-0 items-center gap-1.5 text-fg-muted">
					{#if config.matchCase}
						<span title="Match case"><CaseSensitive class="size-4" /></span>
					{/if}

					{#if config.wholeWord}
						<span title="Match whole word"><WholeWord class="size-4" /></span>
					{/if}

					{#if config.regex}
						<span title="Regular expression"><Regex class="size-4" /></span>
					{/if}
				</div>
			{/snippet}

			{#snippet actions()}
				<Edit bind:config={keywords[i]} />

				<Button
					class="text-fg-muted hover:bg-danger/10 hover:text-danger"
					title="Delete"
					size="icon-sm"
					variant="ghost"
					aria-label="Delete trigger"
					onclick={() => keywords.splice(i, 1)}
				>
					<IconDelete />
				</Button>
			{/snippet}
		</Row>
	{/each}

	<Button class="self-start" variant="outline" onclick={add}>
		<IconAdd />
		Add new trigger
	</Button>
</div>
