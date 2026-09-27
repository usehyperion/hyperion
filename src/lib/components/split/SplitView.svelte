<script lang="ts">
	import type { Surface } from "@danfessler/trellis";
	import { Portal } from "bits-ui";
	import { createSubscriber } from "svelte/reactivity";

	import { app } from "$lib/app.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import * as Empty from "$lib/components/ui/empty";
	import type { SplitDirection } from "$lib/splits/types";

	import Layout from "~icons/ph/layout";
	import SquareHalfBottom from "~icons/ph/square-half-bottom-fill";
	import SquareHalf from "~icons/ph/square-half-fill";

	import Channel from "../channel/Channel.svelte";
	import GuestList from "../stream/GuestList.svelte";

	interface Props {
		surface: Surface;
	}

	const { surface }: Props = $props();

	const channel = $derived(
		surface.view.type === "channel" ? app.channels.get(surface.view.id) : undefined,
	);

	const subscribe = createSubscriber((update) => surface.view.subscribe(update));

	const selected = $derived.by(() => {
		subscribe();
		return surface.view.selected;
	});

	$effect(() => {
		if (channel) surface.view.setTitle(channel.user.displayName);
	});

	function split(direction: SplitDirection) {
		app.splits.split(direction, surface.view.panelId);
	}
</script>

<Portal to={surface.content}>
	<div class="size-full">
		<!-- Only the selected tab keeps its chat mounted -->
		{#if channel && selected}
			<Channel {channel} />
		{:else if surface.view.type === "empty"}
			<Empty.Root class="h-full">
				<Empty.Header>
					<Empty.Media variant="icon">
						<Layout />
					</Empty.Media>

					<Empty.Title>Empty split</Empty.Title>

					<Empty.Description>
						Drag a channel here, or click a channel to open it.
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{/if}
	</div>
</Portal>

{#if channel}
	<Portal to={surface.icon}>
		<img
			class="size-4 shrink-0 rounded-full"
			src={channel.user.avatarUrl}
			alt=""
			width="150"
			height="150"
			draggable="false"
		/>
	</Portal>
{/if}

<Portal to={surface.accessory}>
	<div class="flex items-center gap-x-1 text-muted-foreground" data-slot="split-actions">
		{#if channel?.stream?.guests.size}
			<GuestList {channel} />
		{/if}

		<Button
			class="size-min p-1"
			size="icon-sm"
			variant="ghost"
			title="Split right"
			onclick={() => split("right")}
		>
			<SquareHalf />
		</Button>

		<Button
			class="size-min p-1"
			size="icon-sm"
			variant="ghost"
			title="Split down"
			onclick={() => split("down")}
		>
			<SquareHalfBottom />
		</Button>
	</div>
</Portal>

<style>
	[data-slot="split-actions"] :global(button:hover) {
		color: var(--color-foreground);
	}
</style>
