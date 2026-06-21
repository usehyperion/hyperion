<script lang="ts">
	import Highlight from "$lib/components/message/Highlight.svelte";
	import { Button } from "$lib/components/ui/button";
	import { settings } from "$lib/settings";
	import type { KeywordHighlightConfig } from "$lib/settings";
	import Plus from "~icons/ph/plus";
	import Trash from "~icons/ph/trash";
	import Color from "./Color.svelte";
	import Edit from "./Edit.svelte";
	import StyleSelect from "./Style.svelte";

	const defaults: KeywordHighlightConfig = {
		enabled: true,
		pattern: "",
		style: "default",
		color: "#ff0000",
		regex: false,
		wholeWord: false,
		matchCase: false,
	};
</script>

<div class="flex flex-col gap-y-2.5">
	<Button class="self-start" onclick={() => settings.state["highlights.keywords"].push(defaults)}>
		<Plus />
		Add new trigger
	</Button>

	{#each settings.state["highlights.keywords"] as config, i}
		<Highlight class="m-0" type="custom" config={{ ...config, style: "default" }}>
			<div class="flex items-center gap-x-1.5 p-1.5">
				<Color id="keyword-{i}" bind:value={config.color} />

				<StyleSelect bind:config />

				<div class="ml-auto flex items-center gap-x-1.5">
					<Edit bind:config />

					<Button
						title="Delete"
						size="icon"
						variant="destructive"
						aria-label="Delete trigger"
						onclick={() => settings.state["highlights.keywords"].splice(i, 1)}
					>
						<Trash />
					</Button>
				</div>
			</div>
		</Highlight>
	{/each}
</div>
