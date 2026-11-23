<script lang="ts">
	import { openPath } from "@tauri-apps/plugin-opener";

	import Button from "#lib/components/ui/Button.svelte";
	import Field from "#lib/components/ui/Field.svelte";
	import * as RadioGroup from "#lib/components/ui/radio-group/index.js";
	import Separator from "#lib/components/ui/Separator.svelte";
	import { settings } from "#lib/settings.js";
	import { getThemesDir, loadThemes, themes } from "#lib/themes.js";

	const selected = $derived(settings.state["appearance.theme"]);

	async function openThemeDir() {
		await openPath(await getThemesDir());
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

	<Button size="sm" variant="outline" onclick={loadThemes}>Reload themes</Button>
</div>

{#if themes.size}
	<RadioGroup.Root
		class="gap-2"
		aria-label="Theme"
		bind:value={settings.state["appearance.theme"]}
	>
		{#each themes as [id, theme] (id)}
			{#snippet details()}
				{#if theme.description}
					<span class="block">{theme.description}</span>
				{/if}

				<span class="mt-1 flex h-4 items-center gap-x-2 text-fg-faint">
					{theme.author}

					{#if theme.repository}
						<Separator orientation="vertical" />

						<a href={theme.repository} target="_blank" rel="noreferrer noopener">
							Repository
						</a>
					{/if}

					<Separator orientation="vertical" />

					<span class="font-mono">v{theme.version}</span>
				</span>
			{/snippet}

			<Field
				class="rounded-panel border border-line bg-surface-1 p-3 transition-colors hover:border-line-strong has-data-checked:border-line-strong has-data-checked:bg-surface-2"
				layout="choice"
				trailing
				label={theme.name}
				description={details}
			>
				<RadioGroup.Item value={id} />
			</Field>
		{/each}
	</RadioGroup.Root>
{:else}
	<p class="text-sm text-fg-muted">No themes installed.</p>
{/if}
