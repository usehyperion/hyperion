<script lang="ts">
	import Button from "$lib/components/ui/Button.svelte";
	import { defaultHighlightTypes, settings } from "$lib/settings";
	import type { HighlightType } from "$lib/settings";
	import ArrowClockwise from "~icons/ph/arrow-clockwise";
	import Row from "./Row.svelte";

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
		viewers[key] = { ...defaultHighlightTypes[key] };
	}

	function isDefault(key: HighlightType) {
		const config = viewers[key];
		const original = defaultHighlightTypes[key];

		return (
			config.enabled === original.enabled &&
			config.color === original.color &&
			config.style === original.style
		);
	}
</script>

<div class="flex flex-col gap-2">
	{#each highlights as highlight (highlight.value)}
		<Row
			type={highlight.value}
			id={highlight.value}
			label={highlight.label}
			bind:config={viewers[highlight.value]}
		>
			{#snippet actions()}
				<Button
					class="text-muted-foreground hover:text-foreground"
					title="Reset to default"
					size="icon-sm"
					variant="ghost"
					aria-label="Reset {highlight.label} to default"
					disabled={isDefault(highlight.value)}
					onclick={() => reset(highlight.value)}
				>
					<ArrowClockwise />
				</Button>
			{/snippet}
		</Row>
	{/each}
</div>
