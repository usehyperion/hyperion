<script lang="ts">
	import { RadioGroup } from "@ui-sdk/svelte/radio";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value?: string;
		disabled?: boolean;
		readOnly?: boolean;
		required?: boolean;
		name?: string;
		form?: string;
		loop?: boolean;
	}

	let { class: className, value = $bindable(), ...rest }: Props = $props();
</script>

<RadioGroup
	class={cn("grid gap-2", className)}
	data-component="radio-group"
	{...rest}
	bind:value={() => value ?? null, (next) => next !== null && (value = next)}
/>
