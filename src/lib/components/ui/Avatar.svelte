<script lang="ts">
	import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/svelte/avatar";
	import type { Snippet } from "svelte";
	import type { HTMLImgAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends HTMLImgAttributes {
		fallback?: Snippet;
	}

	const { class: className, width, height, fallback, ...rest }: Props = $props();

	const size = $derived(
		[
			width != null && `--avatar-width: ${width}px`,
			height != null && `--avatar-height: ${height}px`,
		]
			.filter(Boolean)
			.join("; ") || undefined,
	);
</script>

<!-- Width and height only size the avatar when the class doesn't. -->
<Avatar
	class={cn(
		"relative inline-flex h-(--avatar-height,auto) w-(--avatar-width,auto) shrink-0 items-center justify-center overflow-hidden rounded-full object-cover ring-1 ring-line not-data-[loading-status=loaded]:bg-surface-2",
		className,
	)}
	style={size}
>
	<AvatarImage class="size-full [object-fit:inherit]" {width} {height} {...rest} />

	{#if fallback}
		<AvatarFallback class="flex size-full items-center justify-center">
			{@render fallback()}
		</AvatarFallback>
	{/if}
</Avatar>
