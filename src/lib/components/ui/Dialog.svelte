<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLDialogAttributes } from "svelte/elements";

	interface Props extends HTMLDialogAttributes {
		id: string;
		alert?: boolean;
		ref?: HTMLDialogElement;
		header?: Snippet;
		footer?: Snippet;
	}

	let {
		id,
		class: className,
		alert,
		ref = $bindable(),
		header,
		children,
		footer,
		...rest
	}: Props = $props();
</script>

<dialog
	{id}
	class={className}
	role={alert ? "alertdialog" : null}
	data-component="dialog"
	bind:this={ref}
	{...rest}
>
	<header data-slot="dialog-header">
		{@render header?.()}
	</header>

	<div data-slot="dialog-content">
		{@render children?.()}
	</div>

	<footer data-slot="dialog-footer">
		{@render footer?.()}
	</footer>
</dialog>
