<script lang="ts">
	import { DialogClose } from "@ui-sdk/svelte/dialog";

	import type { SettingsCategory } from "#lib/components/settings/schema/types.js";

	import { countFields, filterCategory } from "#lib/components/settings/schema/search.js";
	import Button from "#lib/components/ui/Button.svelte";
	import Dialog from "#lib/components/ui/Dialog.svelte";
	import InputGroup from "#lib/components/ui/InputGroup.svelte";
	import Separator from "#lib/components/ui/Separator.svelte";
	import * as Tabs from "#lib/components/ui/tabs/index.js";
	import { dialogs } from "#lib/dialog.js";
	import { IconClose, IconSearch } from "#lib/icons.js";
	import { log } from "#lib/log.js";
	import { settings } from "#lib/settings.js";
	import { platform } from "#lib/util/index.js";

	import Category from "./Category.svelte";
	import SidebarActions from "./SidebarActions.svelte";

	const imports = import.meta.glob<SettingsCategory>(["./schema/categories/*.ts"], {
		eager: true,
		import: "default",
	});

	const categories = Object.values(imports).toSorted((a, b) => a.order - b.order);
	const isMac = platform === "macos";

	let query = $state("");
	let active = $state(categories[0].label);
	let searchRef = $state<HTMLInputElement | null>(null);

	const searching = $derived(query.trim().length > 0);
	const results = $derived(categories.map((category) => filterCategory(category, query)));
	const counts = $derived(
		new Map(results.map((category) => [category.label, countFields(category.fields)])),
	);
	const total = $derived(counts.values().reduce((sum, count) => sum + count, 0));

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
	id={dialogs.settings}
	class="h-screen max-h-none w-full max-w-none rounded-none border-0 bg-surface-0 shadow-none"
	bodyClass="h-full gap-0 overflow-hidden p-0"
	aria-label="Settings"
	{onkeydown}
	onOpenChange={(open) => {
		if (!open) void onclose();
	}}
>
	<Tabs.Root
		id="settings-tabs"
		class="flex h-full gap-0 overflow-hidden"
		orientation="vertical"
		bind:value={
			() => active,
			(value) => {
				if (value) active = value;
			}
		}
	>
		<div
			class={[
				"settings-nav flex h-full w-52 shrink-0 flex-col gap-3 p-3",
				isMac && "pt-[calc(var(--spacing-title-bar)+4px)]",
			]}
		>
			<InputGroup
				class="bg-surface-0"
				size="lg"
				placeholder="Search settings"
				autocapitalize="off"
				autocomplete="off"
				spellcheck={false}
				clearable
				clearLabel="Clear search"
				aria-label="Search settings"
				onkeydown={(event) => {
					if (event.key === "Escape" && searching) {
						event.stopPropagation();
						event.preventDefault();
						clearSearch();
					}
				}}
				bind:ref={searchRef}
				bind:value={query}
			>
				{#snippet start()}<IconSearch />{/snippet}
			</InputGroup>

			<Tabs.List
				class="min-h-0 flex-1 gap-y-1 overflow-y-auto"
				variant="nav"
				aria-label="Settings categories"
			>
				{#each results as category (category.label)}
					{@const count = counts.get(category.label) ?? 0}

					<Tabs.Tab value={category.label} disabled={searching && count === 0}>
						<category.icon aria-hidden="true" />

						<span class="truncate">{category.label}</span>

						{#if searching}
							<span
								class="settings-result-count ml-auto rounded-sm bg-surface-3 px-1 text-caption text-fg-muted tabular-nums"
							>
								{count}
							</span>
						{/if}
					</Tabs.Tab>
				{/each}
			</Tabs.List>

			<Separator />

			<SidebarActions />
		</div>

		<div
			class="settings-content relative flex min-w-0 grow flex-col border-l border-line bg-surface-1"
		>
			<div class="flex items-center justify-end gap-2 px-4 pt-3 pb-1 text-body text-fg-muted">
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

				<DialogClose>
					{#snippet render({ props })}
						<Button
							{...props}
							size="icon-sm"
							variant="ghost"
							aria-label="Close settings"
						>
							<IconClose />
						</Button>
					{/snippet}
				</DialogClose>
			</div>

			<div class="min-h-0 grow overflow-y-auto px-4 pt-2 pb-10">
				{#each results as category (category.label)}
					<Tabs.Panel class="mx-auto max-w-xl" value={category.label}>
						<Category {category} query={searching ? query.trim() : ""} />
					</Tabs.Panel>
				{/each}
			</div>
		</div>
	</Tabs.Root>
</Dialog>

<style>
	@layer components {
		:global(#settings-tabs [data-slot="separator"]) {
			margin: calc(var(--spacing) * 1) 0;
		}
	}
</style>
