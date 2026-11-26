<script lang="ts">
	import {
		TriggerMenu,
		TriggerMenuContent,
		TriggerMenuItem,
		TriggerMenuList,
		TriggerMenuStatus,
		textFieldAdapter,
	} from "@ui-sdk/svelte/trigger-menu";
	import type { TriggerDefinition } from "@ui-sdk/svelte/trigger-menu";

	import type {
		Suggestion,
		Trigger,
		CommandSuggestion,
		EmoteSuggestion,
		UserSuggestion,
	} from "#lib/completer.svelte.js";

	import Avatar from "./ui/Avatar.svelte";

	interface Props {
		input: HTMLInputElement | null;
		anchor: HTMLElement | null;
		open?: boolean;
		search: (trigger: Trigger, query: string) => Suggestion[];
	}

	let { input, anchor, open = $bindable(false), search }: Props = $props();

	const roleLabels: Record<NonNullable<UserSuggestion["role"]>, string> = {
		broadcaster: "Broadcaster",
		moderator: "Mod",
		vip: "VIP",
	};

	// Items are composed from the completer's ranked results, so the menu
	// shouldn't filter them again. Emotes drop `:` once inserted.
	const triggers: TriggerDefinition[] = [
		{
			char: "@",
			filter: false,
			insert: (item) => `@${item.value} `,
		},
		{
			char: ":",
			filter: false,
			pattern: /\S/u,
			insert: (item) => `${item.value} `,
		},
		{
			char: "/",
			boundary: "start",
			filter: false,
			insert: (item) => `${item.value} `,
		},
	];

	let last: { key: string; suggestions: Suggestion[] } | null = null;

	const editor = $derived(input ? textFieldAdapter(input) : undefined);

	// List state changes with every highlight move, so only search again when
	// the query does.
	function results(trigger: string | null, query: string) {
		if (trigger !== "@" && trigger !== ":" && trigger !== "/") {
			return [];
		}

		const key = trigger + query;

		if (last?.key !== key) {
			last = { key, suggestions: search(trigger, query) };
		}

		return last.suggestions;
	}
</script>

{#snippet commandSuggestion(suggestion: CommandSuggestion)}
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex items-center gap-1">
			<span class="font-medium">{suggestion.display}</span>

			{#each suggestion.command.args as arg (arg.name)}
				<span
					class="rounded-sm border border-line bg-surface-2 px-1 font-mono text-caption text-fg-muted"
				>
					{arg.name}
				</span>
			{/each}
		</div>

		<p class="truncate text-caption text-fg-muted">
			{suggestion.command.description}
		</p>
	</div>

	<span class="shrink-0 text-caption text-fg-muted">
		{suggestion.command.provider}
	</span>
{/snippet}

{#snippet emoteSuggestion(suggestion: EmoteSuggestion)}
	<img class="size-7 shrink-0 object-contain" src={suggestion.imageUrl} alt="" />
	<span class="truncate">{suggestion.display}</span>
{/snippet}

{#snippet userSuggestion(suggestion: UserSuggestion)}
	<span class="contents" aria-hidden="true">
		<Avatar class="size-5" src={suggestion.user.avatarUrl} alt="" />
	</span>

	<span class="truncate font-semibold" style={suggestion.style}>
		{suggestion.display}
	</span>

	{#if suggestion.role}
		<span class="ml-auto shrink-0 rounded-sm bg-surface-2 px-1 text-caption text-fg-muted">
			{roleLabels[suggestion.role]}
		</span>
	{/if}
{/snippet}

<TriggerMenu {editor} {triggers} onOpenChange={() => (last = null)} bind:open>
	<TriggerMenuStatus class="sr-only" />

	<TriggerMenuContent
		class="suggestions popup-surface flex max-h-72 w-(--anchor-width) flex-col overflow-y-auto p-1"
		{anchor}
		side="top"
		align="start"
		sideOffset={6}
	>
		<TriggerMenuList class="flex flex-col gap-px" aria-label="Suggestions">
			{#snippet children(state)}
				{#each results(state.trigger, state.query) as suggestion (suggestion.value)}
					<TriggerMenuItem
						class="suggestion flex min-h-8 cursor-default items-center gap-2 rounded-control px-2 py-1 text-body select-none data-highlighted:bg-surface-3"
						data-type={suggestion.type}
						value={suggestion.value}
						label={suggestion.display}
						title={suggestion.display}
					>
						{#if suggestion.type === "command"}
							{@render commandSuggestion(suggestion)}
						{:else if suggestion.type === "emote"}
							{@render emoteSuggestion(suggestion)}
						{:else}
							{@render userSuggestion(suggestion)}
						{/if}
					</TriggerMenuItem>
				{/each}
			{/snippet}
		</TriggerMenuList>
	</TriggerMenuContent>
</TriggerMenu>
