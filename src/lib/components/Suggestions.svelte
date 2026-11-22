<script lang="ts" module>
	import type { Suggestion, UserSuggestion } from "#lib/completer.svelte.js";

	const roleLabels: Record<NonNullable<UserSuggestion["role"]>, string> = {
		broadcaster: "Broadcaster",
		moderator: "Mod",
		vip: "VIP",
	};
</script>

<script lang="ts">
	import { Listbox, ListboxItem } from "@ui-sdk/svelte/listbox";
	import { Popover, PopoverContent } from "@ui-sdk/svelte/popover";

	import Avatar from "./ui/Avatar.svelte";

	interface Props {
		anchor: HTMLElement | null;
		open: boolean;
		current: number;
		suggestions: Suggestion[];
		onselect: (suggestion: Suggestion) => void;
		onhighlight: (index: number) => void;
	}

	let {
		anchor,
		open = $bindable(),
		current,
		suggestions,
		onselect,
		onhighlight,
	}: Props = $props();

	const selected = $derived(suggestions[current]?.value ?? null);

	function highlight(value: string | null) {
		const index = suggestions.findIndex((s) => s.value === value);
		if (index !== -1) onhighlight(index);
	}

	function select(index: number) {
		// Sync the highlight to the clicked row so completion targets it, not
		// whatever the keyboard last landed on.
		onhighlight(index);
		onselect(suggestions[index]);
	}
</script>

<!-- The chat input keeps focus and drives the highlight, so only an outside press may close this. -->
<Popover
	bind:open
	onOpenChange={(next, details) => {
		if (!next && details.reason !== "outside-press") details.cancel();
	}}
>
	<PopoverContent
		class="flex max-h-72 w-(--anchor-width) popup-surface flex-col overflow-y-auto p-1"
		aria-label="Suggestions"
		{anchor}
		side="top"
		align="start"
		sideOffset={6}
		initialFocus="none"
		finalFocus="none"
	>
		<Listbox
			class="flex flex-col gap-px"
			aria-label="Suggestions"
			value={selected}
			onValueChange={highlight}
		>
			{#each suggestions as suggestion, i (suggestion.value)}
				<ListboxItem
					class="flex min-h-8 cursor-default items-center gap-2 rounded-control px-2 py-1 text-ui control-focus select-none data-selected:bg-surface-3"
					value={suggestion.value}
					label={suggestion.display}
					title={suggestion.display}
					onmouseenter={() => onhighlight(i)}
					onclick={() => select(i)}
					{@attach (element) => {
						if (current === i) element.scrollIntoView({ block: "nearest" });
					}}
				>
					{#if suggestion.type === "command"}
						<div class="flex min-w-0 flex-1 flex-col">
							<div class="flex items-center gap-1">
								<span class="font-medium">{suggestion.display}</span>

								{#each suggestion.command.args as arg (arg.name)}
									<span
										class="rounded-sm border border-line bg-surface-2 px-1 font-mono text-2xs text-fg-muted"
									>
										{arg.name}
									</span>
								{/each}
							</div>

							<p class="truncate text-2xs text-fg-muted">
								{suggestion.command.description}
							</p>
						</div>

						<span class="shrink-0 text-2xs text-fg-muted">
							{suggestion.command.provider}
						</span>
					{:else if suggestion.type === "emote"}
						<img
							class="size-7 shrink-0 object-contain"
							src={suggestion.imageUrl}
							alt=""
						/>

						<span class="truncate">{suggestion.display}</span>
					{:else}
						<Avatar class="size-5" src={suggestion.user.avatarUrl} alt="" />

						<span class="truncate font-semibold" style={suggestion.style}>
							{suggestion.display}
						</span>

						{#if suggestion.role}
							<span
								class="ml-auto shrink-0 rounded-sm bg-surface-2 px-1 text-2xs text-fg-muted"
							>
								{roleLabels[suggestion.role]}
							</span>
						{/if}
					{/if}
				</ListboxItem>
			{/each}
		</Listbox>
	</PopoverContent>
</Popover>
