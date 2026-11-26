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

	// Only rendered for channels that are live.
	const stream = $derived(channel.stream!);
	const guests = $derived([...stream.guests.values()]);
</script>

{#if tooltip}
	{@render content()}
{:else}
	<Popover class="w-fit" side="bottom" aria-label="Guests">
		{#snippet trigger(props)}
			<Button
				{...props}
				title="Live with {guests.map((guest) => guest.displayName).join(', ')}"
				class="h-6 gap-1.5 px-1.5 text-detail font-normal tabular-nums"
				variant="ghost"
				aria-label="View {guests.length} guests"
			>
				<span class="flex -space-x-1.5" aria-hidden="true">
					{#each guests.slice(0, 3) as guest (guest.id)}
						<Avatar
							class="size-4 rounded-full ring-2 ring-surface-2"
							src={guest.avatarUrl}
							alt=""
							width="50"
							height="50"
						/>
					{/each}
				</span>

				{#if guests.length > 3}
					+{guests.length - 3}
				{/if}
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
			"mb-1.5 inline-block text-detail font-medium text-fg-muted uppercase",
			tooltip ? "mt-2" : "mt-3",
		]}
	>
		Live with
	</span>

	<ul class="flex flex-col gap-y-1.5">
		{#each stream.guests as [id, guest] (id)}
			<li>
				{@render participant(guest, guest.viewers)}
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet participant(guest: Omit<Guest, "viewers">, viewers: number | null)}
	<div class="flex items-center justify-between gap-x-8">
		<div class={["flex items-center", tooltip ? "gap-x-1 text-detail" : "gap-x-2 text-body"]}>
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
			<div class="flex items-center text-detail text-live tabular-nums">
				<IconViewers class="mr-1" />
				{viewers}
			</div>
		{/if}
	</div>
{/snippet}
