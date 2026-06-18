<script lang="ts">
	import { app } from "$lib/app.svelte";

	const { children } = $props();

	app.history.reset();
</script>

<div
	class="rails pointer-events-none fixed inset-0 top-title-bar z-0 flex justify-center"
	aria-hidden="true"
>
	<main
		class="relative flex size-full h-full items-center justify-center overflow-hidden border-x bg-background"
	>
		<div class="flex flex-col items-center gap-y-8 px-6 text-center">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.rails {
		--line: light-dark(oklch(0.93 0 0), oklch(0.21 0 0));

		background-image: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 7px,
			var(--line) 7px,
			var(--line) 8px
		);
	}

	main {
		max-width: calc(100% - 5rem);
	}
</style>
