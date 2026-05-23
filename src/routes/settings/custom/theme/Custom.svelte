<script lang="ts">
	import { openPath } from "@tauri-apps/plugin-opener";
	import { app } from "$lib/app.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Field from "$lib/components/ui/field";
	import * as RadioGroup from "$lib/components/ui/radio-group";
	import { Separator } from "$lib/components/ui/separator";
	import { settings } from "$lib/settings";
	import { getThemesDir, injectTheme, loadThemes } from "$lib/themes";

	$effect(() => {
		injectTheme(settings.state["appearance.theme"]);
	});

	async function openThemeDir() {
		await openPath(await getThemesDir());
	}
</script>

<div class="flex items-center gap-x-2">
	<Button size="sm" onclick={openThemeDir}>Open folder</Button>

	<Button
		size="sm"
		variant="outline"
		disabled={!app.themes.size}
		onclick={() => (settings.state["appearance.theme"] = "")}
	>
		Clear selection
	</Button>

	<Button size="sm" variant="outline" onclick={() => loadThemes()}>Reload themes</Button>
</div>

<RadioGroup.Root bind:value={settings.state["appearance.theme"]}>
	{#each app.themes as [id, theme] (id)}
		<Field.Label for={id}>
			<Field.Field orientation="horizontal">
				<Field.Content>
					<Field.Title>{theme.name}</Field.Title>

					<Field.Description>
						{theme.description}
					</Field.Description>

					<div class="flex h-5 items-center gap-x-2 text-xs text-muted-foreground">
						{theme.author}

						{#if theme.repository}
							<Separator orientation="vertical" />
							<a href={theme.repository} target="_blank">Repository</a>
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
