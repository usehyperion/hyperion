<script module lang="ts">
	export const settingsDialogId = "settings-dialog";

	export function openSettings() {
		document.querySelector<HTMLDialogElement>(`#${settingsDialogId}`)?.showModal();
	}

	export function closeSettings() {
		document.querySelector<HTMLDialogElement>(`#${settingsDialogId}`)?.close();
	}
</script>

<script lang="ts">
	import { Tabs } from "bits-ui";
	import Button from "$lib/components/ui/Button.svelte";
	import Dialog from "$lib/components/ui/Dialog.svelte";
	import * as InputGroup from "$lib/components/ui/input-group";
	import Separator from "$lib/components/ui/Separator.svelte";
	import { log } from "$lib/log";
	import { settings } from "$lib/settings";
	import MagnifyingGlass from "~icons/ph/magnifying-glass";
	import X from "~icons/ph/x";
	import Category from "./Category.svelte";
	import { countFields, filterCategory } from "./search";
	import SidebarActions from "./SidebarActions.svelte";
	import type { SettingsCategory } from "./types";

	const imports = import.meta.glob<SettingsCategory>(["./categories/*.ts"], {
		eager: true,
		import: "default",
	});

	const categories = Object.values(imports).toSorted((a, b) => a.order - b.order);

	let query = $state("");
	let active = $state(categories[0].label);
	let searchRef = $state<HTMLInputElement | null>(null);

	const searching = $derived(query.trim().length > 0);
	const results = $derived(categories.map((category) => filterCategory(category, query)));
	const counts = $derived(
		new Map(results.map((category) => [category.label, countFields(category.fields)])),
	);
	const total = $derived(results.reduce((sum, { fields }) => sum + countFields(fields), 0));

	// Keep the selection on a category that still has something to show
	$effect(() => {
		if (!searching || counts.get(active)) return;

		const first = results.find((category) => counts.get(category.label));

		if (first) {
			active = first.label;
		}
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key === "f" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			searchRef?.focus();
			searchRef?.select();
		}
	}

	function clearSearch() {
		query = "";
		searchRef?.focus();
	}

	async function onclose() {
		await settings.saveNow();
		log.info("Settings saved");
	}
</script>

<Dialog
	id={settingsDialogId}
	class="m-0 h-screen max-h-none max-w-none! overflow-hidden rounded-none p-0 *:data-[slot=dialog-content]:h-full *:data-[slot=dialog-content]:space-y-0"
	aria-label="Settings"
	{onkeydown}
	{onclose}
>
	<Tabs.Root
		id="settings-tabs"
		class="flex h-full overflow-hidden"
		orientation="vertical"
		bind:value={active}
	>
		<div class="flex h-full w-52 shrink-0 flex-col gap-3 p-3">
			<InputGroup.Root class="h-9 bg-background">
				<InputGroup.Addon>
					<MagnifyingGlass />
				</InputGroup.Addon>

				<InputGroup.Input
					placeholder="Search settings"
					aria-label="Search settings"
					autocapitalize="off"
					autocomplete="off"
					spellcheck={false}
					bind:ref={searchRef}
					bind:value={query}
					onkeydown={(event) => {
						if (event.key === "Escape" && searching) {
							event.stopPropagation();
							event.preventDefault();
							clearSearch();
						}
					}}
				/>

				{#if searching}
					<InputGroup.Addon align="inline-end">
						<InputGroup.Button
							size="icon-xs"
							aria-label="Clear search"
							onclick={clearSearch}
						>
							<X />
						</InputGroup.Button>
					</InputGroup.Addon>
				{/if}
			</InputGroup.Root>

			<Tabs.List class="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
				{#each results as category (category.label)}
					{@const count = counts.get(category.label) ?? 0}

					<Tabs.Trigger value={category.label} disabled={searching && count === 0}>
						{#snippet child({ props })}
							<Button
								class="w-full justify-start text-muted-foreground hover:bg-accent/50 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-xs"
								variant="ghost"
								{...props}
							>
								<category.icon />

								<span class="truncate">{category.label}</span>

								{#if searching}
									<span
										class="ml-auto rounded-full bg-primary/20 px-1.5 text-xs tabular-nums"
									>
										{count}
									</span>
								{/if}
							</Button>
						{/snippet}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			<Separator />

			<SidebarActions />
		</div>

		<div class="relative flex min-w-0 grow flex-col border-l bg-accent/15">
			<div
				class="flex items-center justify-end gap-2 px-4 pt-3 text-sm text-muted-foreground"
			>
				<div class="mr-auto">
					Settings

					{#if searching}
						&bullet;

						<span class="tabular-nums">
							{total}
							{total === 1 ? "result" : "results"}
						</span>
					{/if}
				</div>

				<Button
					size="icon-sm"
					variant="ghost"
					onclick={closeSettings}
					aria-label="Close settings"
				>
					<X />
				</Button>
			</div>

			<div class="min-h-0 grow overflow-y-auto px-4 pt-2 pb-10">
				{#each results as category (category.label)}
					<Tabs.Content class="mx-auto max-w-xl" value={category.label}>
						<Category {category} query={searching ? query.trim() : ""} />
					</Tabs.Content>
				{/each}
			</div>
		</div>
	</Tabs.Root>
</Dialog>

<style>
	:global(#settings-tabs [data-slot="separator"]) {
		margin: calc(var(--spacing) * 1) 0;
	}
</style>
