<script lang="ts">
	import * as Field from "$lib/components/ui/field";
	import { Input } from "$lib/components/ui/input";
	import * as NativeSelect from "$lib/components/ui/native-select";
	import * as RadioGroup from "$lib/components/ui/radio-group";
	import { Slider } from "$lib/components/ui/slider";
	import { Switch } from "$lib/components/ui/switch";
	import { settings } from "$lib/settings";
	import FieldControl from "./FieldControl.svelte";
	import type { BaseField, SettingsField } from "./types";

	interface Props {
		field: SettingsField;
	}

	const { field }: Props = $props();
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
	{#if field.renderAs === "field"}
		<Field.Field>
			{@render content(field)}

			<field.component />
		</Field.Field>
	{:else}
		<Field.Set>
			<Field.Legend>{field.label}</Field.Legend>

			{@render description(field.description)}

			<field.component />
		</Field.Set>
	{/if}
{:else if field.type === "input"}
	<Field.Field>
		<Field.Label for={field.id}>{field.label}</Field.Label>

		<Input
			id={field.id}
			class="max-w-1/2"
			type="text"
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

		<div class="max-w-52 *:data-[slot=native-select-wrapper]:w-full">
			<NativeSelect.Root bind:value={settings.state[field.id]}>
				{#each field.items as item (item.value)}
					<NativeSelect.Option value={item.value}>
						{item.label}
					</NativeSelect.Option>
				{/each}
			</NativeSelect.Root>
		</div>

		{@render description(field.description)}
	</Field.Field>
{:else if field.type === "slider"}
	<Field.Field>
		{@render content(field)}

		<Slider
			id={field.id}
			class="relative flex items-center"
			type="single"
			thumbLabel={field.thumbLabel}
			tickLabel={field.tickLabel}
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

		<Switch id={field.id} bind:checked={settings.state[field.id]} />
	</Field.Field>
{/if}

{#snippet description(description?: string)}
	{#if description}
		<Field.Description>
			{@html description}
		</Field.Description>
	{/if}
{/snippet}

{#snippet content(field: BaseField)}
	<Field.Content>
		<Field.Label for={field.id}>{field.label}</Field.Label>

		{@render description(field.description)}
	</Field.Content>
{/snippet}
