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
	import Separator from "$lib/components/ui/Separator.svelte";
	import { log } from "$lib/log";
	import { settings } from "$lib/settings";
	import { logOut } from "$lib/twitch/auth";
	import SignOut from "~icons/ph/sign-out";
	import X from "~icons/ph/x";
	import Category from "./Category.svelte";
	import SidebarActions from "./SidebarActions.svelte";
	import type { SettingsCategory } from "./types";

	const imports = import.meta.glob<SettingsCategory>(["./categories/*.ts"], {
		eager: true,
		import: "default",
	});

	const categories = Object.values(imports).toSorted((a, b) => a.order - b.order);

	async function onclose() {
		await settings.saveNow();
		log.info("Settings saved");
	}
</script>

<Dialog
	id={settingsDialogId}
	class="h-full max-h-[85%] overflow-hidden p-0 **:data-[slot=dialog-content]:h-full **:data-[slot=dialog-content]:space-y-0 sm:max-w-[90%]"
	aria-label="Settings"
	{onclose}
>
	<Tabs.Root
		id="settings-tabs"
		class="flex h-full overflow-hidden"
		orientation="vertical"
		value={categories[0].label}
	>
		<div
			class="h-full w-48 shrink-0 overflow-y-auto p-2 transition-[width] duration-300 ease-out-quint"
		>
			<Tabs.List class="space-y-0.5">
				{#each categories as category (category.label)}
					<Tabs.Trigger value={category.label}>
						{#snippet child({ props })}
							<Button
								class="text-muted-foreground hover:bg-accent/50 data-[state=active]:bg-muted data-[state=active]:text-foreground"
								variant="ghost"
								{...props}
							>
								<category.icon />
								{category.label}
							</Button>
						{/snippet}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			<Separator />

			<div class="space-y-1">
				<SidebarActions />
			</div>

			<Separator />

			<Button class="text-muted-foreground" variant="ghost" onclick={logOut}>
				<SignOut />
				<span class="text-sm">Log out</span>
			</Button>
		</div>

		<div class="relative grow overflow-y-auto border-l bg-accent/15 p-4 pb-8">
			<Button
				class="absolute top-2 right-2"
				size="icon"
				variant="ghost"
				onclick={closeSettings}
				aria-label="Close settings"
			>
				<X />
			</Button>

			{#each categories as category (category.label)}
				<Tabs.Content class="mx-auto max-w-xl" value={category.label}>
					<Category {category} />
				</Tabs.Content>
			{/each}
		</div>
	</Tabs.Root>
</Dialog>

<style>
	:global(#settings-tabs [data-slot="separator"]) {
		margin: calc(var(--spacing) * 2) 0;
	}

	:global(#settings-tabs) > div:first-child :global(button) {
		width: 100%;
		display: flex;
		justify-content: flex-start;
	}
</style>
