<script lang="ts">
	import type { Channel } from "$lib/models/channel.svelte";
	import type { Guest } from "$lib/models/stream.svelte";
	import Users from "~icons/ph/users-bold";
	import { Button } from "../ui/button";
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
	<Button
		class="size-min p-1 text-xs"
		size="sm"
		variant="ghost"
		popovertarget="guest-list-{channel.id}"
		aria-label="View guests"
	>
		+{stream.guests.size}
	</Button>

	<Popover id="guest-list-{channel.id}" class="w-fit">
		{@render content()}
	</Popover>
{/if}

{#snippet content()}
	{#if !tooltip}
		{@render participant(channel.user, stream.viewers)}
	{/if}

	<span
		class={[
			"mb-1 inline-block text-xs font-medium text-muted-foreground uppercase",
			tooltip ? "mt-2" : "mt-4",
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
			<img
				src={guest.avatarUrl}
				alt={guest.displayName}
				class={["rounded-full", tooltip ? "size-5" : "size-6"]}
				width="50"
				height="50"
			/>

			<span
				class="font-medium"
				style:color={tooltip ? "var(--color-text-primary-foreground)" : guest.color}
			>
				{guest.displayName}
			</span>
		</div>

		{#if viewers != null}
			<div class="flex items-center text-xs text-red-400 dark:text-red-500">
				<Users class="mr-1" />
				{viewers}
			</div>
		{/if}
	</div>
{/snippet}
