<script lang="ts">
	import { Switch, SwitchThumb } from "@ui-sdk/svelte/switch";
	import type { HTMLButtonAttributes } from "svelte/elements";

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
	}

	let { class: className, checked = $bindable(false), ...rest }: Props = $props();
</script>

<Switch
	class={cn(
		"peer inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-line-strong bg-surface-3 p-px control-focus transition-colors",
		"data-checked:border-fg data-checked:bg-fg",
		"data-disabled:cursor-not-allowed data-disabled:opacity-50 data-invalid:border-danger",
		className,
	)}
	{...rest}
	bind:checked
>
	<SwitchThumb
		class="pointer-events-none block size-3 rounded-full bg-fg-muted transition-[translate,background-color] duration-150 ease-out-quart data-checked:translate-x-3 data-checked:bg-fg-inverse rtl:data-checked:-translate-x-3"
	/>
</Switch>
