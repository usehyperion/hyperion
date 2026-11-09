<script lang="ts">
	import ArrowClockwise from "~icons/ph/arrow-clockwise";

	import type { HighlightType } from "#lib/highlights.js";

	import Button from "#lib/components/ui/Button.svelte";
	import { HIGHLIGHTS } from "#lib/highlights.js";
	import { settings } from "#lib/settings.js";

	import Row from "./Row.svelte";

	const highlights = Object.entries(HIGHLIGHTS).map(([value, kind]) => ({
		label: `${kind.label}s`,
		value: value as HighlightType,
	}));

	const viewers = $derived(settings.state["highlights.viewers"]);

	function reset(key: HighlightType) {
		viewers[key] = { ...HIGHLIGHTS[key].defaults };
	}

	function isDefault(key: HighlightType) {
		const config = viewers[key];
		const original = HIGHLIGHTS[key].defaults;

		return Object.entries(original).every(
			([field, value]) => config[field as keyof typeof original] === value,
		);
	}
</script>

<div class="flex flex-col gap-2">
	{#each highlights as highlight (highlight.value)}
		<Row
			type={highlight.value}
			id={highlight.value}
			label={highlight.label}
			bind:config={viewers[highlight.value]}
		>
			{#snippet actions()}
				<Button
					class="text-muted-foreground hover:text-foreground"
					title="Reset to default"
					size="icon-sm"
					variant="ghost"
					aria-label="Reset {highlight.label} to default"
					disabled={isDefault(highlight.value)}
					onclick={() => reset(highlight.value)}
				>
					<ArrowClockwise />
				</Button>
			{/snippet}
		</Row>
	{/each}
</div>
