<script lang="ts">
	import Button from "$lib/components/ui/Button.svelte";
	import * as Empty from "$lib/components/ui/empty";
	import { settings } from "$lib/settings";
	import type { KeywordHighlightConfig } from "$lib/settings";
	import CaseSensitive from "~icons/local/case-sensitive";
	import Regex from "~icons/local/regex";
	import WholeWord from "~icons/local/whole-word";
	import Highlighter from "~icons/ph/highlighter";
	import Plus from "~icons/ph/plus";
	import Trash from "~icons/ph/trash";
	import Edit from "./Edit.svelte";
	import Row from "./Row.svelte";

	const keywords = $derived(settings.state["highlights.keywords"]);

	function add() {
		keywords.push({
			enabled: true,
			pattern: "",
			style: "default",
			color: "#ff0000",
			regex: false,
			wholeWord: false,
			matchCase: false,
		} satisfies KeywordHighlightConfig);
	}
</script>

<div class="flex flex-col gap-2">
	{#if keywords.length === 0}
		<Empty.Root class="border border-dashed py-8">
			<Empty.Header>
				<Empty.Media variant="icon">
					<Highlighter />
				</Empty.Media>

				<Empty.Title>No keyword triggers</Empty.Title>

				<Empty.Description>
					Add a trigger to highlight messages containing specific words.
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{/if}

	{#each keywords as config, i}
		<Row
			type="custom"
			id="keyword-{i}"
			label={config.pattern || "Empty pattern"}
			bind:config={keywords[i]}
		>
			{#snippet badges()}
				<div class="flex shrink-0 items-center gap-1.5 text-muted-foreground">
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
					class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
					title="Delete"
					size="icon-sm"
					variant="ghost"
					aria-label="Delete trigger"
					onclick={() => keywords.splice(i, 1)}
				>
					<Trash />
				</Button>
			{/snippet}
		</Row>
	{/each}

	<Button class="self-start" variant="outline" onclick={add}>
		<Plus />
		Add new trigger
	</Button>
</div>
