<script lang="ts">
	import Highlight from "$lib/components/message/Highlight.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import { defaultHighlightTypes, settings } from "$lib/settings";
	import type { HighlightType } from "$lib/settings";
	import ArrowClockwise from "~icons/ph/arrow-clockwise";
	import Color from "./Color.svelte";
	import StyleSelect from "./Style.svelte";

	const highlights = [
		{ label: "Mentions", value: "mention" },
		{ label: "First Time Chats", value: "new" },
		{ label: "Returning Chatters", value: "returning" },
		{ label: "Suspicious Users", value: "suspicious" },
		{ label: "Broadcasters", value: "broadcaster" },
		{ label: "Moderators", value: "moderator" },
		{ label: "Subscribers", value: "subscriber" },
		{ label: "VIPs", value: "vip" },
	] as const;

	const viewers = $derived(settings.state["highlights.viewers"]);

	function reset(key: HighlightType) {
		viewers[key] = defaultHighlightTypes[key];
	}
</script>

<div class="flex flex-col gap-y-2.5">
	{#each highlights as highlight}
		{@const config = viewers[highlight.value]}

		<Highlight
			class="m-0"
			type={highlight.value}
			config={{ enabled: true, color: config.color, style: "default" }}
		>
			<div class="flex items-center gap-x-1.5 p-1.5">
				<Color id={highlight.value} bind:value={config.color} />

				<StyleSelect bind:config={viewers[highlight.value]} />

				<Button
					class="ml-auto"
					title="Reset"
					size="icon"
					variant="outline"
					aria-label="Reset to default"
					onclick={() => reset(highlight.value)}
				>
					<ArrowClockwise />
				</Button>
			</div>
		</Highlight>
	{/each}
</div>
