<script lang="ts" module>
	import type { Command } from "$lib/commands";
	import type { User } from "$lib/models/user.svelte";

	interface BaseSuggestion {
		value: string;
		display: string;
	}

	interface CommandSuggestion extends BaseSuggestion, Omit<Required<Command>, "name" | "exec"> {
		type: "command";
	}

	interface EmoteSuggestion extends BaseSuggestion {
		type: "emote";
		imageUrl: string;
	}

	interface UserSuggestion extends BaseSuggestion {
		type: "user";
		style: string;
		user: User;
		role?: "broadcaster" | "moderator" | "vip";
	}

	const roleLabels: Record<NonNullable<UserSuggestion["role"]>, string> = {
		broadcaster: "Broadcaster",
		moderator: "Mod",
		vip: "VIP",
	};

	export type Suggestion = CommandSuggestion | EmoteSuggestion | UserSuggestion;
</script>

<script lang="ts">
	import { Combobox } from "bits-ui";

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

	const items = $state<(HTMLElement | null)[]>(Array.from({ length: 25 }, () => null));

	// Keep the highlighted row in view as the selection moves via keyboard.
	$effect(() => {
		items[current]?.scrollIntoView({ block: "nearest" });
	});

	function select(value: string) {
		const index = suggestions.findIndex((s) => s.value === value);
		if (index === -1) return;

		// Sync the highlight to the clicked row so completion targets it, not
		// whatever the keyboard last landed on.
		onhighlight(index);
		onselect(suggestions[index]);
	}
</script>

<Combobox.Root type="single" onValueChange={select} bind:open>
	<Combobox.Portal>
		<Combobox.Content
			class="flex max-h-72 w-(--bits-combobox-anchor-width) flex-col gap-0.5 overflow-y-auto rounded-2xl bg-popover p-1 text-popover-foreground smooth-shadow-ring-md"
			customAnchor={anchor}
			side="top"
			sideOffset={8}
		>
			{#each suggestions as suggestion, i (suggestion.value)}
				<Combobox.Item
					class={[
						"relative flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-hidden transition-colors select-none",
						"data-current:bg-accent data-current:text-accent-foreground",
					]}
					title={suggestion.display}
					value={suggestion.value}
					data-current={current === i ? true : null}
					onmouseenter={() => onhighlight(i)}
					bind:ref={items[i]}
				>
					{#if suggestion.type === "command"}
						<div class="flex min-w-0 flex-1 flex-col">
							<div class="flex items-center gap-1">
								<span class="font-medium">{suggestion.display}</span>

								{#each suggestion.args as arg (arg)}
									<span
										class="rounded border border-primary/20 bg-background px-1 py-0.5 text-xs text-muted-foreground"
									>
										{arg}
									</span>
								{/each}
							</div>

							<p class="truncate text-xs text-muted-foreground">
								{suggestion.description}
							</p>
						</div>

						<span class="shrink-0 text-xs text-muted-foreground">
							{suggestion.provider}
						</span>
					{:else if suggestion.type === "emote"}
						<img
							class="size-8 shrink-0 object-contain"
							src={suggestion.imageUrl}
							alt={suggestion.display}
						/>

						<span class="truncate">{suggestion.display}</span>
					{:else}
						{#if suggestion.user.avatarUrl}
							<img
								class="size-6 shrink-0 rounded-full bg-muted object-cover"
								src={suggestion.user.avatarUrl}
								alt={suggestion.display}
							/>
						{:else}
							<!-- Placeholder until the avatar is backfilled in the background. -->
							<div class="size-6 shrink-0 rounded-full bg-muted"></div>
						{/if}

						<span class="truncate font-semibold" style={suggestion.style}>
							{suggestion.display}
						</span>

						{#if suggestion.role}
							<span
								class="ml-auto shrink-0 rounded bg-background px-1 py-0.5 text-xs text-muted-foreground"
							>
								{roleLabels[suggestion.role]}
							</span>
						{/if}
					{/if}
				</Combobox.Item>
			{/each}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
