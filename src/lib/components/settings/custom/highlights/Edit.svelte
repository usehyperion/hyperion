<script lang="ts">
	import Button from "$lib/components/ui/Button.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import Dialog from "$lib/components/ui/Dialog.svelte";
	import * as Field from "$lib/components/ui/field";
	import Input from "$lib/components/ui/Input.svelte";
	import type { KeywordHighlightConfig } from "$lib/settings";
	import Pencil from "~icons/ph/pencil";

	let { config = $bindable<KeywordHighlightConfig>() } = $props();

	const id = $props.id();

	const dialogId = `edit-highlight-dialog-${id}`;
</script>

<Button
	class="text-muted-foreground hover:text-foreground"
	title="Edit"
	command="show-modal"
	commandfor={dialogId}
	size="icon-sm"
	variant="ghost"
	aria-label="Edit pattern"
>
	<Pencil />
</Button>

<Dialog id={dialogId}>
	{#snippet header()}
		<h2>Edit pattern</h2>
	{/snippet}

	<Field.Field>
		<Field.Label for="p-{id}">Pattern</Field.Label>

		<Input
			id="p-{id}"
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
		<Button command="close" commandfor={dialogId}>Save</Button>
	{/snippet}
</Dialog>
