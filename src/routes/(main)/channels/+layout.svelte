<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { app } from "$lib/app.svelte";
	import { settings } from "$lib/settings";

	const { children } = $props();

	async function handleKeydown(event: KeyboardEvent) {
		if ((!event.metaKey && !event.ctrlKey) || event.repeat) return;

		switch (event.key) {
			case "t": {
				if (settings.state["advanced.singleConnection"] || !app.splits.focused) return;

				app.splits.insertEmpty(
					app.splits.focused,
					settings.state["splits.defaultOrientation"],
				);

				break;
			}

			case "w": {
				if (app.splits.focused && app.splits.root && app.splits.root !== app.splits.focused) {
					event.preventDefault();
					app.splits.remove(app.splits.focused);
				} else if (app.focused) {
					event.preventDefault();

					await app.focused.leave();
					await goto(resolve("/"));
				}

				break;
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{@render children()}
