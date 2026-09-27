<script lang="ts">
	import type { Gif } from "$lib/twitch/irc";

	interface Props {
		gif: Gif;
		alt: string;
	}

	const { gif, alt }: Props = $props();
</script>

<div class="mt-2">
	<!-- The height is fixed so messages don't shift around as GIFs load in. -->
	<img
		class="h-40 w-auto max-w-100 rounded-lg border bg-card object-contain"
		src={gif.url}
		{alt}
		title={alt}
		decoding="async"
	/>
</div>
