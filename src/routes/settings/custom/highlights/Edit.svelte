<script lang="ts">
	import { buttonVariants } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Field from "$lib/components/ui/field";
	import Input from "$lib/components/ui/input/input.svelte";
	import type { KeywordHighlightConfig } from "$lib/settings";
	import Pencil from "~icons/ph/pencil";

	const id = $props.id();

	let { config = $bindable<KeywordHighlightConfig>() } = $props();

	let trigger = $state<HTMLElement | null>(null);
</script>

<Dialog.Root>
	<Dialog.Trigger
		class={buttonVariants({ size: "icon", variant: "outline" })}
		title="Edit"
		aria-label="Edit pattern"
		bind:ref={trigger}
	>
		<Pencil />
	</Dialog.Trigger>

	<Dialog.Content
		class="max-w-sm!"
		onCloseAutoFocus={(event) => {
			event.preventDefault();
			trigger?.focus();
		}}
	>
		<Dialog.Header>
			<Dialog.Title>Edit pattern</Dialog.Title>
		</Dialog.Header>

		<Field.Field>
			<Field.Label for="pattern">Pattern</Field.Label>

			<Input
				id="pattern"
				type="text"
				autocapitalize="off"
				autocorrect="off"
				placeholder="Enter pattern"
				bind:value={config.pattern}
			/>
		</Field.Field>

		<Field.Group class="gap-3">
			<Field.Field orientation="horizontal">
				<Checkbox id="r-{id}" bind:checked={config.regex} />

				<Field.Label class="font-normal" for="r-{id}">
					Match as regular expression
				</Field.Label>
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

		<Dialog.Footer>
			<Dialog.Close class={buttonVariants()}>Save</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
