<script lang="ts">
	import Warning from "~icons/ph/warning";

	interface Props {
		message: string;
	}

	const { message }: Props = $props();
</script>

<div
	class="rounded-t-md border border-b-0 border-border bg-surface-sunken px-3 py-2.5 text-sm transition-colors duration-200 has-[+div>input:focus-visible]:border-border-strong"
>
	<div class="flex gap-1">
		<Warning class="mt-px shrink-0 text-warning" />

		<p class="text-foreground-subtle">{message}</p>
	</div>
</div>
