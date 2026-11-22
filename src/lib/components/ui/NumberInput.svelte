<script lang="ts">
	import {
		NumberInput,
		NumberInputControl,
		NumberInputDecrement,
		NumberInputGroup,
		NumberInputIncrement,
		type NumberInputOptions,
	} from "@ui-sdk/svelte/number-input";
	import type { HTMLAttributes } from "svelte/elements";

	import { IconAdd, IconIndeterminate } from "#lib/icons.js";
	import { cn } from "#lib/util/styles.js";

	type Props = Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue"> &
		Omit<NumberInputOptions, "value"> & {
			value?: number | null;
			placeholder?: string;
			"aria-label"?: string;
		};

	let {
		class: className,
		value = $bindable(),
		placeholder,
		"aria-label": ariaLabel,
		...rest
	}: Props = $props();

	const stepper = cn(
		"flex h-full w-6 shrink-0 cursor-pointer items-center justify-center text-fg-muted control-focus",
		"hover:bg-surface-3 hover:text-fg data-disabled:cursor-not-allowed data-disabled:opacity-40",
		"[&_svg]:size-3",
	);
</script>

<NumberInput class={cn("w-full", className)} {...rest} bind:value>
	<NumberInputGroup class="control-field overflow-hidden px-0">
		<NumberInputDecrement class={cn(stepper, "border-e border-line")} aria-label="Decrease">
			<IconIndeterminate />
		</NumberInputDecrement>

		<NumberInputControl
			class="h-full min-w-0 flex-1 bg-transparent px-2 text-center font-mono text-ui tabular-nums outline-none"
			{placeholder}
			aria-label={ariaLabel}
		/>

		<NumberInputIncrement class={cn(stepper, "border-s border-line")} aria-label="Increase">
			<IconAdd />
		</NumberInputIncrement>
	</NumberInputGroup>
</NumberInput>
