<script lang="ts">
	import { createDialogController, DialogClose, DialogTrigger } from "@ui-sdk/svelte/dialog";

	import type { KeywordHighlightConfig } from "#lib/highlights.js";

	import Button from "#lib/components/ui/Button.svelte";
	import Checkbox from "#lib/components/ui/Checkbox.svelte";
	import Dialog from "#lib/components/ui/Dialog.svelte";
	import Field from "#lib/components/ui/Field.svelte";
	import Input from "#lib/components/ui/Input.svelte";
	import { IconEdit } from "#lib/icons.js";

	let { config = $bindable<KeywordHighlightConfig>() } = $props();

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
	<Field label="Pattern">
		<Input
			autocapitalize="off"
			autocorrect="off"
			placeholder="Enter pattern"
			bind:value={config.pattern}
		/>
	</Field>

	<div class="flex flex-col gap-2">
		<Field layout="choice" label="Match as regular expression">
			<Checkbox bind:checked={config.regex} />
		</Field>

		<Field layout="choice" label="Match whole word">
			<Checkbox bind:checked={config.wholeWord} />
		</Field>

		<Field layout="choice" label="Match case">
			<Checkbox bind:checked={config.matchCase} />
		</Field>
	</div>

	{#snippet footer()}
		<DialogClose>
			{#snippet render({ props })}
				<Button {...props} size="sm">Save</Button>
			{/snippet}
		</DialogClose>
	{/snippet}
</Dialog>
