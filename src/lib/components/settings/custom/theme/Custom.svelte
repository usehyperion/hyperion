<script lang="ts">
	import { openPath } from "@tauri-apps/plugin-opener";

	import { app } from "$lib/app.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import * as Field from "$lib/components/ui/field";
	import * as RadioGroup from "$lib/components/ui/radio-group";
	import Separator from "$lib/components/ui/Separator.svelte";
	import { settings } from "$lib/settings";
	import { getThemesDir, reloadThemes } from "$lib/themes";

	const selected = $derived(settings.state["appearance.theme"]);

	async function openThemeDir() {
		await openPath(await getThemesDir());
	}

	async function reload() {
		await reloadThemes(settings.state["appearance.theme"]);
	}
</script>

<div class="flex items-center gap-x-2">
	<Button size="sm" onclick={openThemeDir}>Open folder</Button>

	<Button
		size="sm"
		variant="outline"
		disabled={!selected}
		onclick={() => (settings.state["appearance.theme"] = "")}
	>
		Clear selection
	</Button>

	<Button size="sm" variant="outline" onclickwait={reload}>Reload themes</Button>
</div>

{#if app.themes.size}
	<RadioGroup.Root bind:value={settings.state["appearance.theme"]}>
		{#each app.themes as [id, theme] (id)}
			<Field.Label for={id}>
				<Field.Field orientation="horizontal">
					<Field.Content>
						<Field.Title>{theme.name}</Field.Title>

						{#if theme.description}
							<Field.Description>
								{theme.description}
							</Field.Description>
						{/if}

						<div class="flex h-5 items-center gap-x-2 text-xs text-muted-foreground">
							{theme.author}

							{#if theme.repository}
								<Separator orientation="vertical" />

								<a
									href={theme.repository}
									target="_blank"
									rel="noreferrer noopener"
								>
									Repository
								</a>
							{/if}

							<Separator orientation="vertical" />

							v{theme.version}
						</div>
					</Field.Content>

					<RadioGroup.Item {id} value={id} />
				</Field.Field>
			</Field.Label>
		{/each}
	</RadioGroup.Root>
{:else}
	<p class="text-sm text-muted-foreground">No themes installed.</p>
{/if}
