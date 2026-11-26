<script lang="ts">
	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { Guest } from "#lib/models/stream.svelte.js";

	import { IconViewers } from "#lib/icons.js";

	import Avatar from "../ui/Avatar.svelte";
	import Button from "../ui/Button.svelte";
	import Popover from "../ui/Popover.svelte";

	interface Props {
		tooltip?: boolean;
		channel: Channel;
	}

	const { tooltip = false, channel }: Props = $props();

	// This was already checked in <TitleBar />
	const stream = $derived(channel.stream!);
</script>

{#if tooltip}
	{@render content()}
{:else}
	<Popover class="w-fit" side="bottom" aria-label="Guests">
		{#snippet trigger(props)}
			<Button
				{...props}
				class="size-min p-1 text-xs"
				size="sm"
				variant="ghost"
				aria-label="View guests"
			>
				+{stream.guests.size}
			</Button>
		{/snippet}

		{@render content()}
	</Popover>
{/if}

{#snippet content()}
	{#if !tooltip}
		{@render participant(channel.user, stream.viewers)}
	{/if}

	<span
		class={[
			"mb-1 inline-block text-xs font-medium text-fg-muted uppercase",
			tooltip ? "mt-2" : "mt-3",
		]}
	>
		Live with
	</span>

	<ul class="flex flex-col gap-y-1">
		{#each stream.guests as [id, guest] (id)}
			<li>
				{@render participant(guest, guest.viewers)}
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet participant(guest: Omit<Guest, "viewers">, viewers: number | null)}
	<div class="flex items-center justify-between gap-x-8">
		<div class={["flex items-center", tooltip ? "gap-x-1 text-xs" : "gap-x-2 text-sm"]}>
			<Avatar
				class={tooltip ? "size-5" : "size-6"}
				src={guest.avatarUrl}
				alt={guest.displayName}
				width="50"
				height="50"
			/>

			<span class="font-medium" style:color={tooltip ? "var(--color-fg)" : guest.color}>
				{guest.displayName}
			</span>
		</div>

		{#if viewers != null}
			<div class="flex items-center text-xs text-danger tabular-nums">
				<IconViewers class="mr-1" />
				{viewers}
			</div>
		{/if}
	</div>
{/snippet}
