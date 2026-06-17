<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLDialogAttributes } from "svelte/elements";

	interface Props extends HTMLDialogAttributes {
		id: string;
		alert?: boolean;
		header?: Snippet;
		footer?: Snippet;
	}

	const { id, class: className, alert, header, children, footer, ...rest }: Props = $props();
</script>

<dialog {id} class={className} role={alert ? "alertdialog" : null} {...rest}>
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
