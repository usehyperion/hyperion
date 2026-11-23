<script lang="ts">
	import type { SettingsField } from "#lib/components/settings/schema/types.js";

	import Field from "#lib/components/ui/Field.svelte";
	import FieldSet from "#lib/components/ui/FieldSet.svelte";
	import Input from "#lib/components/ui/Input.svelte";
	import * as RadioGroup from "#lib/components/ui/radio-group/index.js";
	import Select from "#lib/components/ui/Select.svelte";
	import Slider from "#lib/components/ui/Slider.svelte";
	import Switch from "#lib/components/ui/Switch.svelte";
	import { settings } from "#lib/settings.js";

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

{#snippet markdown(text: string)}
	{@html parseDescription(text)}
{/snippet}

{#if field.type === "group"}
	<FieldSet class="gap-4" legend={field.label}>
		{#each field.fields as subField (subField)}
			<FieldControl field={subField} />
		{/each}
	</FieldSet>
{:else}
	{#snippet description()}
		{#if field.description}
			{@render markdown(field.description)}
		{/if}
	{/snippet}

	{@const described = field.description ? description : undefined}

	{#if field.type === "custom"}
		<FieldSet legend={field.label} description={described}>
			<field.component />
		</FieldSet>
	{:else if field.type === "input"}
		<Field label={field.label} description={described} disabled={field.disabled?.()}>
			<Input
				class="max-w-1/2"
				autocapitalize="off"
				autocomplete="off"
				disabled={field.disabled?.()}
				placeholder={field.placeholder}
				bind:value={settings.state[field.id]}
			/>
		</Field>
	{:else if field.type === "radio"}
		<Field label={field.label} description={described} disabled={field.disabled?.()}>
			<RadioGroup.Root
				class="mt-1 gap-2.5"
				disabled={field.disabled?.()}
				bind:value={settings.state[field.id]}
			>
				{#each field.items as option (option.value)}
					{#snippet optionDescription()}
						{#if option.description}{@render markdown(option.description)}{/if}
					{/snippet}

					<Field
						layout="choice"
						label={option.label}
						description={option.description ? optionDescription : undefined}
					>
						<RadioGroup.Item value={option.value} />
					</Field>
				{/each}
			</RadioGroup.Root>
		</Field>
	{:else if field.type === "select"}
		<Field label={field.label} description={described} disabled={field.disabled?.()}>
			<div class="max-w-52">
				<Select
					options={field.items}
					disabled={field.disabled?.()}
					bind:value={settings.state[field.id]}
				/>
			</div>
		</Field>
	{:else if field.type === "slider"}
		<Field label={field.label} description={described} disabled={field.disabled?.()}>
			<Slider
				formatValue={field.formatValue}
				showSteps={field.showSteps}
				min={field.min}
				max={field.max}
				step={field.step}
				disabled={field.disabled?.()}
				bind:value={settings.state[field.id]}
			/>
		</Field>
	{:else if field.type === "switch"}
		<Field
			layout="row"
			label={field.label}
			description={described}
			disabled={field.disabled?.()}
		>
			<Switch disabled={field.disabled?.()} bind:checked={settings.state[field.id]} />
		</Field>
	{/if}
{/if}
