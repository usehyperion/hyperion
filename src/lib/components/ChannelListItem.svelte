<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import { getSidebarContext } from "$lib/context";
	import type { Channel } from "$lib/models/channel.svelte";
	import StreamTooltip from "./StreamTooltip.svelte";

	interface Props {
		channel: Channel;
		dragging: boolean;
		placeholder: "circle" | "row";
		attach: Attachment<HTMLElement>;
	}

	const { channel, dragging, placeholder, attach }: Props = $props();

	const sidebar = getSidebarContext();
	const showCircle = $derived(placeholder === "circle" || sidebar.collapsed);
</script>

<div class="relative px-1.5" {@attach attach}>
	<div class={[dragging && "invisible"]}>
		<StreamTooltip {channel} />
	</div>

	{#if dragging}
		<div class="pointer-events-none absolute inset-0 flex items-center px-1.5">
			{#if showCircle}
				<div class="flex h-9 w-full items-center justify-center">
					<div
						class="size-7 rounded-full border-2 border-dashed border-muted-foreground/60"
					></div>
				</div>
			{:else}
				<div
					class="h-9 w-full rounded-md border-2 border-dashed border-muted-foreground/40"
				></div>
			{/if}
		</div>
	{/if}
</div>
