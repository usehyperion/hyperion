<script lang="ts">
	import { Radio, RadioIndicator } from "@ui-sdk/svelte/radio";
	import type { HTMLButtonAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends Omit<HTMLButtonAttributes, "children" | "value" | "disabled"> {
		value: string;
		disabled?: boolean;
	}

	let { class: className, ...rest }: Props = $props();
</script>

<Radio
	class={cn(
		"peer inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border border-fg-faint bg-surface-2 control-focus transition-colors",
		"hover:not-data-disabled:border-fg-muted data-checked:border-fg data-checked:bg-fg",
		"aria-invalid:border-danger data-disabled:cursor-not-allowed data-disabled:opacity-50",
		className,
	)}
	{...rest}
>
	<RadioIndicator
		class="size-1.5 rounded-full bg-fg-inverse transition-[opacity,scale] duration-100 data-ending-style:scale-50 data-ending-style:opacity-0 data-starting-style:scale-50 data-starting-style:opacity-0"
	/>
</Radio>
