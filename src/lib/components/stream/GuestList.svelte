<script lang="ts">
	import Users from "~icons/ph/users-bold";

	import type { Guest, Stream } from "#lib/models/stream.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import Avatar from "../ui/Avatar.svelte";
	import Button from "../ui/Button.svelte";
	import Popover from "../ui/Popover.svelte";

	interface Props {
		stream: Stream;

		/**
		 * The broadcaster, listed above the guests when given.
		 */
		host?: User;
		tooltip?: boolean;
	}

	const { stream, host, tooltip = false }: Props = $props();
</script>

{#if tooltip}
	{@render content()}
{:else}
	<Button
		class="size-min p-1 text-xs"
		size="sm"
		variant="ghost"
		popovertarget="guest-list-{stream.channelId}"
		aria-label="View guests"
	>
		+{stream.guests.size}
	</Button>

	<Popover id="guest-list-{stream.channelId}" class="w-fit">
		{@render content()}
	</Popover>
{/if}

{#snippet content()}
	{#if host}
		{@render participant(host, stream.viewers)}
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
			<Avatar
				class={tooltip ? "size-5" : "size-6"}
				src={guest.avatarUrl}
				alt={guest.displayName}
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
			<div class="flex items-center text-xs text-red-500 tabular-nums dark:text-red-400">
				<Users class="mr-1" />
				{viewers}
			</div>
		{/if}
	</div>
{/snippet}
