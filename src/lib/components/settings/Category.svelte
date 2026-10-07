<script lang="ts">
	import MagnifyingGlass from "~icons/ph/magnifying-glass";

	import type { SettingsCategory } from "#lib/settings/types.js";

	import * as Empty from "#lib/components/ui/empty/index.js";

	import FieldControl from "./FieldControl.svelte";

	interface Props {
		category: SettingsCategory;
		query?: string;
	}

	const { category, query = "" }: Props = $props();
</script>

<div class="space-y-6" data-component="settings-category">
	<header class="flex items-center gap-3" data-slot="settings-category-header">
		<div
			class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
			data-slot="settings-category-icon"
		>
			<category.icon />
		</div>

		<div>
			<h2 class="text-lg leading-tight font-semibold" data-slot="settings-category-title">
				{category.label}
			</h2>

			{#if query}
				<p class="text-sm text-muted-foreground" data-slot="settings-category-query">
					Matching "{query}"
				</p>
			{/if}
		</div>
	</header>

	{#if category.fields.length === 0}
		<Empty.Root class="border">
			<Empty.Header>
				<Empty.Media variant="icon">
					<MagnifyingGlass />
				</Empty.Media>

				<Empty.Title>No settings found</Empty.Title>

				<Empty.Description>
					Nothing in {category.label} matches "{query}". Try a different search.
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="space-y-6 divide-y divide-border *:pb-6" data-slot="settings-category-fields">
			{#each category.fields as field, i (i)}
				<FieldControl {field} />
			{/each}
		</div>
	{/if}
</div>
