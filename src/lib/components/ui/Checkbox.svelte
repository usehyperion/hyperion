<script lang="ts">
	import { Checkbox, CheckboxIndicator, type CheckedState } from "@ui-sdk/svelte/checkbox";
	import type { HTMLButtonAttributes } from "svelte/elements";

	import { IconChecked, IconIndeterminate } from "#lib/icons.js";
	import { cn } from "#lib/util/styles.js";

	interface Props extends Omit<
		HTMLButtonAttributes,
		"children" | "disabled" | "name" | "value" | "form"
	> {
		disabled?: boolean;
		readOnly?: boolean;
		required?: boolean;
		name?: string;
		value?: string;
		form?: string;
		checked?: boolean;
		indeterminate?: boolean;
	}

	let {
		class: className,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		...rest
	}: Props = $props();

	function setChecked(next: CheckedState) {
		indeterminate = next === "indeterminate";
		checked = next === true;
	}
</script>

<Checkbox
	class={cn(
		"peer inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-fg-faint bg-surface-2 text-fg-inverse control-focus transition-colors",
		"hover:not-data-disabled:border-fg-muted",
		"data-checked:border-fg data-checked:bg-fg data-indeterminate:border-fg data-indeterminate:bg-fg",
		"aria-invalid:border-danger data-disabled:cursor-not-allowed data-disabled:opacity-50",
		className,
	)}
	{...rest}
	bind:checked={() => (indeterminate ? "indeterminate" : checked), setChecked}
>
	<CheckboxIndicator
		class="flex transition-[opacity,scale] duration-100 starting:scale-75 starting:opacity-0 ending:scale-75 ending:opacity-0"
	>
		{#snippet children(state)}
			{#if state.indeterminate}
				<IconIndeterminate class="size-3" aria-hidden="true" />
			{:else}
				<IconChecked class="size-3" aria-hidden="true" />
			{/if}
		{/snippet}
	</CheckboxIndicator>
</Checkbox>
