<script lang="ts">
	import * as Field from "$lib/components/ui/field";
	import FieldControl from "./FieldControl.svelte";
	import type { SettingsCategory } from "./types";

	interface Props {
		category: SettingsCategory;
	}

	const { category }: Props = $props();
</script>

<Field.Set>
	<Field.Legend class="text-2xl!">{category.label}</Field.Legend>

	{#each category.fields as field, i}
		<FieldControl {field} />

		{#if i < category.fields.length - 1}
			<Field.Separator />
		{/if}
	{/each}
</Field.Set>
