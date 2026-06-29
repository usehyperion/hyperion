<script lang="ts">
	import Button from "$lib/components/ui/Button.svelte";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import Dialog from "$lib/components/ui/Dialog.svelte";
	import * as Field from "$lib/components/ui/field";
	import Input from "$lib/components/ui/Input.svelte";
	import type { KeywordHighlightConfig } from "$lib/settings";
	import Pencil from "~icons/ph/pencil";

	const id = $props.id();

	let { config = $bindable<KeywordHighlightConfig>() } = $props();
</script>

<Button
	title="Edit"
	command="show-modal"
	commandfor="edit-highlight-dialog"
	size="icon"
	variant="outline"
	aria-label="Edit pattern"
>
	<Pencil />
</Button>

<Dialog id="edit-highlight-dialog" class="**:data-[slot=dialog-content]:space-y-2">
	{#snippet header()}
		<h2>Edit pattern</h2>
	{/snippet}

	<Field.Field>
		<Field.Label for="pattern">Pattern</Field.Label>

		<Input
			id="pattern"
			autocapitalize="off"
			autocorrect="off"
			placeholder="Enter pattern"
			bind:value={config.pattern}
		/>
	</Field.Field>

	<Field.Group class="gap-3">
		<Field.Field orientation="horizontal">
			<Checkbox id="r-{id}" bind:checked={config.regex} />

			<Field.Label class="font-normal" for="r-{id}">Match as regular expression</Field.Label>
		</Field.Field>

		<Field.Field orientation="horizontal">
			<Checkbox id="w-{id}" bind:checked={config.wholeWord} />

			<Field.Label class="font-normal" for="w-{id}">Match whole word</Field.Label>
		</Field.Field>

		<Field.Field orientation="horizontal">
			<Checkbox id="c-{id}" bind:checked={config.matchCase} />

			<Field.Label class="font-normal" for="c-{id}">Match case</Field.Label>
		</Field.Field>
	</Field.Group>

	{#snippet footer()}
		<Button command="close" commandfor="edit-highlight-dialog">Save</Button>
	{/snippet}
</Dialog>
