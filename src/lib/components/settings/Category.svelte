<script lang="ts">
	import type { SettingsCategory } from "#lib/components/settings/schema/types.js";

	import Empty from "#lib/components/ui/Empty.svelte";
	import { IconSearch } from "#lib/icons.js";

	import FieldControl from "./FieldControl.svelte";

	interface Props {
		category: SettingsCategory;
		query?: string;
	}

	const { category, query = "" }: Props = $props();
</script>

<div class="space-y-6">
	<header class="flex items-center gap-3">
		<div
			class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-muted"
		>
			<category.icon />
		</div>

		<div>
			<h2 class="text-title leading-tight font-semibold">{category.label}</h2>

			{#if query}
				<p class="text-body text-fg-muted">Matching "{query}"</p>
			{/if}
		</div>
	</header>

	{#if category.fields.length === 0}
		<Empty
			class="border"
			icon={IconSearch}
			title="No settings found"
			description={`Nothing in ${category.label} matches "${query}". Try a different search.`}
		/>
	{:else}
		<div class="space-y-6 divide-y divide-line *:pb-6">
			{#each category.fields as field, i (i)}
				<FieldControl {field} />
			{/each}
		</div>
	{/if}
</div>
