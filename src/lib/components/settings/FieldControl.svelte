<script lang="ts">
	import type { BaseField, SettingsField } from "#lib/components/settings/schema/types.js";

	import * as Field from "#lib/components/ui/field/index.js";
	import Input from "#lib/components/ui/Input.svelte";
	import * as RadioGroup from "#lib/components/ui/radio-group/index.js";
	import Select from "#lib/components/ui/Select.svelte";
	import Slider from "#lib/components/ui/Slider.svelte";
	import Switch from "#lib/components/ui/Switch.svelte";
	import { settings } from "#lib/settings/index.js";

	import FieldControl from "./FieldControl.svelte";

	interface Props {
		field: SettingsField;
	}

	const { field }: Props = $props();

	// Descriptions use a small subset of Markdown: inline code, links, bold,
	// and italics.
	function parseDescription(description: string) {
		return description
			.replace(/`([^`]+)`/g, "<code>$1</code>")
			.replace(
				/\[([^\]]+)\]\(([^)]+)\)/g,
				'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
			)
			.replace(/(\*\*)(.*?)\1/g, "<strong>$2</strong>")
			.replace(/(\*)(.*?)\1/g, "<em>$2</em>");
	}
</script>

{#if field.type === "group"}
	<Field.Set>
		{#if field.label}
			<Field.Legend>{field.label}</Field.Legend>
		{/if}

		<Field.Group>
			{#each field.fields as subField}
				<FieldControl field={subField} />
			{/each}
		</Field.Group>
	</Field.Set>
{:else if field.type === "custom"}
	<Field.Set>
		<Field.Legend>{field.label}</Field.Legend>

		{@render description(field.description)}

		<field.component />
	</Field.Set>
{:else if field.type === "input"}
	<Field.Field>
		<Field.Label for={field.id}>{field.label}</Field.Label>

		<Input
			id={field.id}
			class="max-w-1/2"
			autocapitalize="off"
			autocomplete="off"
			disabled={field.disabled?.()}
			placeholder={field.placeholder}
			bind:value={settings.state[field.id]}
		/>

		{@render description(field.description)}
	</Field.Field>
{:else if field.type === "radio"}
	<Field.Set>
		{@render content(field)}

		<RadioGroup.Root
			id={field.id}
			disabled={field.disabled?.()}
			bind:value={settings.state[field.id]}
		>
			{#each field.items as option (option.value)}
				<Field.Field class={[option.description && "items-start"]} orientation="horizontal">
					<RadioGroup.Item
						class={[option.description && "mt-0.5"]}
						value={option.value}
					/>

					<Field.Label aria-disabled={field.disabled?.()}>
						<Field.Content>
							{option.label}

							{@render description(option.description)}
						</Field.Content>
					</Field.Label>
				</Field.Field>
			{/each}
		</RadioGroup.Root>
	</Field.Set>
{:else if field.type === "select"}
	<Field.Field>
		<Field.Label for={field.id}>{field.label}</Field.Label>

		<div class="max-w-52">
			<Select
				id={field.id}
				options={field.items}
				disabled={field.disabled?.()}
				bind:value={settings.state[field.id]}
			/>
		</div>

		{@render description(field.description)}
	</Field.Field>
{:else if field.type === "slider"}
	<Field.Field>
		{@render content(field)}

		<Slider
			id={field.id}
			type="single"
			formatValue={field.formatValue}
			showSteps={field.showSteps}
			min={field.min}
			max={field.max}
			step={field.step}
			disabled={field.disabled?.()}
			bind:value={settings.state[field.id]}
		/>
	</Field.Field>
{:else if field.type === "switch"}
	<Field.Field orientation="horizontal">
		{@render content(field)}

		<Switch
			id={field.id}
			disabled={field.disabled?.()}
			bind:checked={settings.state[field.id]}
		/>
	</Field.Field>
{/if}

{#snippet description(description?: string)}
	{#if description}
		<Field.Description>
			{@html parseDescription(description)}
		</Field.Description>
	{/if}
{/snippet}

{#snippet content(field: BaseField)}
	<Field.Content>
		<Field.Label for={field.id}>{field.label}</Field.Label>

		{@render description(field.description)}
	</Field.Content>
{/snippet}
