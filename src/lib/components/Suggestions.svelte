<script lang="ts" module>
	import type { Command } from "$lib/commands";

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
	}

	export type Suggestion = CommandSuggestion | EmoteSuggestion | UserSuggestion;
</script>

<script lang="ts">
	import { Combobox } from "bits-ui";

	interface Props {
		anchor: HTMLElement | null;
		open: boolean;
		index: number;
		suggestions: Suggestion[];
		onselect: (suggestion: Suggestion) => void;
	}

	let { anchor, open = $bindable(), index, suggestions, onselect }: Props = $props();

	const items = $state<(HTMLDivElement | null)[]>(Array.from({ length: 25 }, () => null));

	$effect(() => {
		items[index]?.scrollIntoView({ block: "nearest" });
	});
</script>

<Combobox.Root
	type="single"
	onValueChange={(value) => {
		const suggestion = suggestions.find((s) => s.value === value);
		if (suggestion) onselect(suggestion);
	}}
	bind:open
>
	<Combobox.Portal>
		<Combobox.Content
			class="flex max-h-72 w-(--bits-combobox-anchor-width) flex-col overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground"
			customAnchor={anchor}
			side="top"
			sideOffset={8}
		>
			{#each suggestions as suggestion, i (suggestion.value)}
				<Combobox.Item
					class={[
						"relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
						"data-current:bg-accent data-current:text-accent-foreground",
					]}
					title={suggestion.display}
					value={suggestion.value}
					data-current={index === i ? true : null}
					onmouseenter={() => (index = i)}
					bind:ref={items[i]}
				>
					{#if suggestion.type === "command"}
						<div class="flex w-full items-center justify-between">
							<div class="flex flex-col">
								<div class="flex items-center gap-1">
									<span class="font-medium">{suggestion.display}</span>

									{#each suggestion.args as arg}
										<span
											class="rounded border border-primary/20 bg-background px-1 py-0.5 text-xs"
										>
											{arg}
										</span>
									{/each}
								</div>

								<p class="mt-px text-xs text-muted-foreground">
									{suggestion.description}
								</p>
							</div>

							<span class="text-muted-foreground">{suggestion.provider}</span>
						</div>
					{:else if suggestion.type === "emote"}
						<img
							class="size-8 object-contain"
							src={suggestion.imageUrl}
							alt={suggestion.display}
						/>

						<span class="overflow-x-hidden overflow-ellipsis">
							{suggestion.display}
						</span>
					{:else}
						<span class="font-semibold" style={suggestion.style}>
							{suggestion.display}
						</span>
					{/if}
				</Combobox.Item>
			{/each}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
