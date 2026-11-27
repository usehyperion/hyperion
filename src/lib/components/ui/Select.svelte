<script lang="ts" generics="T extends string | number">
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectItemIndicator,
		SelectTrigger,
		SelectValue,
	} from "@ui-sdk/svelte/select";
	import type { HTMLButtonAttributes } from "svelte/elements";

	import { IconChecked, IconExpand } from "#lib/icons.js";
	import { cn } from "#lib/util/styles.js";

	interface Option {
		label: string;
		value: T;
	}

	interface Props extends Omit<HTMLButtonAttributes, "children" | "value"> {
		options: Option[];
		disabled?: boolean;
		value?: T;
		placeholder?: string;
		name?: string;
		required?: boolean;
	}

	let {
		class: className,
		options,
		value = $bindable(),
		placeholder,
		name,
		required,
		disabled,
		...rest
	}: Props = $props();

	const items = $derived(
		options.map((option) => ({ value: String(option.value), label: option.label })),
	);

	function select(next: string | null) {
		const option = options.find((option) => String(option.value) === next);
		if (option) value = option.value;
	}
</script>

<Select
	{items}
	{placeholder}
	{name}
	{required}
	{disabled}
	bind:value={() => (value === undefined ? null : String(value)), select}
>
	<SelectTrigger
		class={cn(
			"control-field w-full cursor-default justify-between gap-1.5 pr-1.5 text-left data-open:border-line-strong",
			className,
		)}
		{...rest}
	>
		<SelectValue class="truncate data-placeholder:text-fg-faint" />
		<IconExpand class="select-icon size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
	</SelectTrigger>

	<SelectContent
		class="popup-surface max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto p-1"
		sideOffset={4}
	>
		{#each items as item (item.value)}
			<SelectItem
				class="flex h-control-sm cursor-default items-center gap-2 rounded-sm pr-1.5 pl-2 outline-none select-none data-disabled:opacity-50 data-highlighted:bg-surface-3"
				value={item.value}
			>
				<span class="truncate">{item.label}</span>

				<SelectItemIndicator class="ml-auto flex text-fg-muted">
					<IconChecked class="size-3.5" aria-hidden="true" />
				</SelectItemIndicator>
			</SelectItem>
		{/each}
	</SelectContent>
</Select>
