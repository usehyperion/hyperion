<script lang="ts">
	import type { HighlightType } from "#lib/highlights.js";

	import Button from "#lib/components/ui/Button.svelte";
	import { HIGHLIGHTS } from "#lib/highlights.js";
	import { IconReset } from "#lib/icons.js";
	import { settings } from "#lib/settings.js";

	import { STYLES } from "./Appearance.svelte";
	import Row from "./Row.svelte";

	const kinds = Object.entries(HIGHLIGHTS).map(([type, kind]) => ({
		type: type as HighlightType,
		icon: kind.icon,
		label: `${kind.label}s`,
	}));

	const viewers = $derived(settings.state["highlights.viewers"]);

	function reset(type: HighlightType) {
		viewers[type] = { ...HIGHLIGHTS[type].defaults };
	}

	function isDefault(type: HighlightType) {
		const config = viewers[type];
		const original = HIGHLIGHTS[type].defaults;

		return Object.entries(original).every(
			([field, value]) => config[field as keyof typeof original] === value,
		);
	}
</script>

<ul class="@container divide-y divide-line rounded-panel border border-line">
	{#each kinds as kind (kind.type)}
		<Row label={kind.label} bind:config={viewers[kind.type]}>
			<kind.icon
				class="size-3.5 shrink-0 text-fg-muted transition-opacity group-data-[enabled=false]/row:opacity-40"
				aria-hidden="true"
			/>

			<span
				class="truncate transition-colors group-data-[enabled=false]/row:text-fg-faint"
				title={kind.label}
			>
				{kind.label}
			</span>

			<span class="ms-auto hidden shrink-0 text-caption text-fg-faint @sm:inline">
				{STYLES.find((style) => style.value === viewers[kind.type].style)?.label}
			</span>

			{#snippet footer()}
				<Button
					class="w-full justify-start"
					size="sm"
					variant="ghost"
					disabled={isDefault(kind.type)}
					onclick={() => reset(kind.type)}
				>
					<IconReset />
					Reset to default
				</Button>
			{/snippet}
		</Row>
	{/each}
</ul>
