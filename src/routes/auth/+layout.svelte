<script lang="ts">
	const { children } = $props();
</script>

<div class="rails fixed inset-0 top-title-bar z-0 flex justify-center" aria-hidden="true">
	<main
		class="relative flex size-full h-full items-center justify-center overflow-hidden border-x bg-surface-0"
	>
		<div class="flex flex-col items-center gap-y-8 px-6 text-center">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.rails {
		background-image: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 7px,
			var(--color-line) 7px,
			var(--color-line) 8px
		);
	}

	main {
		max-width: calc(100% - 5rem);
	}
</style>
