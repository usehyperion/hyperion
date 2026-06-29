<script lang="ts">
	import { RadioGroup } from "bits-ui";
	import { setMode, userPrefersMode } from "mode-watcher";
	import Label from "$lib/components/ui/Label.svelte";
	import ArrowsClockwise from "~icons/ph/arrows-clockwise";

	const themes = [
		{ value: "light", class: "bg-white" },
		{ value: "dark", class: "bg-neutral-950" },
		{ value: "system" },
	];
</script>

<RadioGroup.Root
	class="flex flex-nowrap items-center gap-4"
	bind:value={() => userPrefersMode.current, (value) => setMode(value)}
>
	{#each themes as theme (theme.value)}
		<Label class="flex-col">
			<RadioGroup.Item
				class={[
					"flex size-16 items-center justify-center rounded-lg border",
					theme.class,
					userPrefersMode.current === theme.value && "border-2 border-primary",
				]}
				value={theme.value}
			>
				{#if theme.value === "system"}
					<ArrowsClockwise class="size-6 text-muted-foreground" />
				{/if}
			</RadioGroup.Item>

			<span class="capitalize">{theme.value}</span>
		</Label>
	{/each}
</RadioGroup.Root>
