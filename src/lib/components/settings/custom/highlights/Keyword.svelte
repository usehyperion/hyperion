<script lang="ts">
	import { Toggle } from "@ui-sdk/svelte/toggle";
	import { tick } from "svelte";

	import CaseSensitive from "~icons/local/case-sensitive";
	import Regex from "~icons/local/regex";
	import WholeWord from "~icons/local/whole-word";

	import type { KeywordHighlightConfig } from "#lib/highlights.js";

	import Button from "#lib/components/ui/Button.svelte";
	import InputGroup from "#lib/components/ui/InputGroup.svelte";
	import { KEYWORD_HIGHLIGHT } from "#lib/highlights.js";
	import { IconAdd, IconDelete } from "#lib/icons.js";
	import { settings } from "#lib/settings.js";

	import Row from "./Row.svelte";

	interface Flag {
		key: "matchCase" | "wholeWord" | "regex";
		label: string;
		icon: unknown;
	}

	const flags = [
		{ key: "matchCase", label: "Match case", icon: CaseSensitive },
		{ key: "wholeWord", label: "Match whole word", icon: WholeWord },
		{ key: "regex", label: "Use regular expression", icon: Regex },
	] satisfies Flag[];

	let list = $state<HTMLUListElement>();

	const keywords = $derived(settings.state["highlights.keywords"]);

	async function add() {
		keywords.push({ ...KEYWORD_HIGHLIGHT.defaults });

		await tick();

		const inputs = list?.querySelectorAll<HTMLInputElement>("input[aria-label=Keyword]");
		inputs?.[inputs.length - 1]?.focus();
	}

	function invalid(config: KeywordHighlightConfig) {
		if (!config.regex || !config.pattern) return false;

		try {
			return !new RegExp(config.pattern);
		} catch {
			return true;
		}
	}
</script>

<ul class="divide-y divide-line rounded-panel border border-line" bind:this={list}>
	{#each keywords as config, i (config)}
		{@const label = config.pattern || "Empty keyword"}

		<Row {label} bind:config={keywords[i]}>
			<InputGroup
				class="min-w-0 flex-1 transition-opacity group-data-[enabled=false]/row:opacity-50"
				inputClass="font-mono text-caption"
				autocapitalize="off"
				autocorrect="off"
				spellcheck={false}
				placeholder={config.regex ? "Regular expression" : "Word or phrase"}
				aria-label="Keyword"
				aria-invalid={invalid(config)}
				bind:value={keywords[i].pattern}
			>
				{#snippet end()}
					{#each flags as flag (flag.key)}
						<Toggle
							class="flex size-5 cursor-pointer items-center justify-center rounded-sm text-fg-faint control-focus transition-colors hover:text-fg aria-pressed:bg-accent/15 aria-pressed:text-accent [&_svg]:size-3.5"
							title={flag.label}
							aria-label={flag.label}
							bind:pressed={keywords[i][flag.key]}
						>
							<flag.icon aria-hidden="true" />
						</Toggle>
					{/each}
				{/snippet}
			</InputGroup>

			{#snippet trailing()}
				<Button
					title="Delete"
					class="-me-1 text-fg-faint hover:bg-danger/10 hover:text-danger"
					size="icon-sm"
					variant="ghost"
					aria-label="Delete {label}"
					onclick={() => keywords.splice(i, 1)}
				>
					<IconDelete />
				</Button>
			{/snippet}
		</Row>
	{/each}

	<li>
		<button
			class="flex h-9 w-full cursor-pointer items-center gap-2 rounded-b-panel px-2.5 text-fg-muted control-focus transition-colors not-first:rounded-t-none first:rounded-t-panel hover:bg-tint hover:text-fg [&_svg]:size-3.5"
			type="button"
			onclick={add}
		>
			<IconAdd aria-hidden="true" />
			Add keyword
		</button>
	</li>
</ul>
