<script lang="ts">
	import Button from "#lib/components/ui/Button.svelte";
	import * as Field from "#lib/components/ui/field/index.js";
	import * as InputGroup from "#lib/components/ui/input-group/index.js";
	import Input from "#lib/components/ui/Input.svelte";
	import Link from "#lib/components/ui/Link.svelte";
	import NumberInput from "#lib/components/ui/NumberInput.svelte";
	import Textarea from "#lib/components/ui/Textarea.svelte";

	interface Props {
		onsave?: () => Promise<unknown>;
	}

	const { onsave }: Props = $props();

	let name = $state("");
	let notes = $state("");
	let points = $state<number | null>(5);
	let search = $state("");
</script>

<Field.Field>
	<Field.Label>Display name</Field.Label>
	<Input bind:value={name} />
	<Field.Description>Shown in chat.</Field.Description>
</Field.Field>

<Field.Field>
	<Field.Label>Notes</Field.Label>
	<Textarea bind:value={notes} />
</Field.Field>

<Field.Field>
	<Field.Label>Points per vote</Field.Label>
	<NumberInput min={1} max={6} bind:value={points} />
</Field.Field>

<InputGroup.Root>
	<InputGroup.Input aria-label="Search viewers" bind:value={search} />
	<InputGroup.Addon align="inline-end">
		<InputGroup.Button size="icon-xs" aria-label="Clear search" onclick={() => (search = "")}>
			×
		</InputGroup.Button>
	</InputGroup.Addon>
</InputGroup.Root>

<Button onclick={onsave}>Save</Button>
<Link href="https://example.com" disabled>Docs</Link>

<output data-testid="state">{JSON.stringify({ name, notes, points, search })}</output>
