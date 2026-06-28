<script lang="ts">
	import Warning from "~icons/ph/warning";

	interface Props {
		message: string;
	}

	const { message }: Props = $props();
</script>

<div
	class="rounded-t-md border border-b-0 border-muted bg-muted/50 px-3 py-2.5 text-sm transition-colors duration-200 has-[+div>input:focus-visible]:border-input"
>
	<div class="flex gap-1">
		<Warning class="mt-px shrink-0 text-yellow-400" />

		<p class="text-muted-foreground">{message}</p>
	</div>
</div>
