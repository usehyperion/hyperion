<script lang="ts">
	import { createDialogController, DialogClose, DialogTrigger } from "@ui-sdk/svelte/dialog";

	import type { KeywordHighlightConfig } from "#lib/highlights.js";

	import Button from "#lib/components/ui/Button.svelte";
	import Checkbox from "#lib/components/ui/Checkbox.svelte";
	import Dialog from "#lib/components/ui/Dialog.svelte";
	import * as Field from "#lib/components/ui/field/index.js";
	import Input from "#lib/components/ui/Input.svelte";
	import { IconEdit } from "#lib/icons.js";

	let { config = $bindable<KeywordHighlightConfig>() } = $props();

	const id = $props.id();

	const dialog = createDialogController();
</script>

<DialogTrigger controller={dialog}>
	{#snippet render({ props })}
		<Button
			{...props}
			class="text-fg-muted hover:text-fg"
			title="Edit"
			size="icon-sm"
			variant="ghost"
			aria-label="Edit pattern"
		>
			<IconEdit />
		</Button>
	{/snippet}
</DialogTrigger>

<Dialog controller={dialog} title="Edit pattern">
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
		<DialogClose>
			{#snippet render({ props })}
				<Button {...props} size="sm">Save</Button>
			{/snippet}
		</DialogClose>
	{/snippet}
</Dialog>
