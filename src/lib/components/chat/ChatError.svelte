<script lang="ts">
	import { IconWarning } from "#lib/icons.js";

	interface Props {
		message: string;
	}

	const { message }: Props = $props();
</script>

<div
	class="rounded-t-md border border-b-0 border-line bg-tint px-3 py-2.5 text-body transition-colors duration-200 has-[+div>input:focus-visible]:border-line-strong"
>
	<div class="flex gap-1">
		<IconWarning class="mt-px shrink-0 text-warning" />

		<p class="text-fg-muted">{message}</p>
	</div>
</div>
