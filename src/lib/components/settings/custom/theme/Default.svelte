<script lang="ts">
	import { Radio, RadioGroup, RadioIndicator } from "@ui-sdk/svelte/radio";
	import { setMode, userPrefersMode } from "mode-watcher";

	const themes = [
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
		{ value: "system", label: "System" },
	] as const;

	type Mode = (typeof themes)[number]["value"];

	function isMode(value: string | null): value is Mode {
		return themes.some((theme) => theme.value === value);
	}
</script>

<div class="@container">
	<RadioGroup
		class="grid gap-2 @max-md:max-w-3xs @min-md:grid-cols-3"
		aria-label="Theme"
		bind:value={() => userPrefersMode.current, (value) => isMode(value) && setMode(value)}
	>
		{#each themes as theme (theme.value)}
			<Radio
				class="group flex cursor-pointer flex-col overflow-hidden rounded-panel border border-line bg-surface-1 text-left control-focus transition-colors hover:border-line-strong data-checked:border-fg"
				value={theme.value}
			>
				<span class="block aspect-4/3 w-full border-b border-line">
					{#if theme.value === "system"}
						<span class="relative block size-full">
							<span class="absolute inset-0 block [clip-path:inset(0_50%_0_0)]">
								{@render shell(false)}
							</span>

							<span class="absolute inset-0 block [clip-path:inset(0_0_0_50%)]">
								{@render shell(true)}
							</span>
						</span>
					{:else}
						{@render shell(theme.value === "dark")}
					{/if}
				</span>

				<span class="flex items-center gap-2 px-2.5 py-2">
					<span
						class="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-fg-faint bg-surface-2 transition-colors group-data-checked:border-fg group-data-checked:bg-fg"
					>
						<RadioIndicator class="size-1.5 rounded-full bg-fg-inverse" />
					</span>

					<span class="font-medium">{theme.label}</span>
				</span>
			</Radio>
		{/each}
	</RadioGroup>
</div>

{#snippet shell(dark: boolean)}
	{const surface = $derived(dark ? "bg-neutral-950" : "bg-white")}
	{const chrome = $derived(dark ? "bg-neutral-900" : "bg-neutral-100")}
	{const bar = $derived(dark ? "bg-neutral-700" : "bg-neutral-300")}
	{const dot = $derived(dark ? "bg-neutral-800" : "bg-neutral-200")}

	<span class="flex size-full flex-col {surface}">
		<span class="flex shrink-0 items-center gap-1 px-1.5 py-1.5 {chrome}">
			<span class="block h-1 w-4 rounded-full {bar}"></span>
			<span class="block h-1 w-3 rounded-full {bar}"></span>
			<span class="ml-auto block h-1 w-1 rounded-full {bar}"></span>
		</span>

		<span class="flex min-h-0 flex-1">
			<span class="flex shrink-0 flex-col items-center gap-1 px-1 py-1.5 {chrome}">
				<span class="block size-2 rounded-full {bar}"></span>
				<span class="block size-2 rounded-full {dot}"></span>
				<span class="block size-2 rounded-full {dot}"></span>
			</span>

			<span class="flex min-w-0 flex-1 flex-col gap-1 p-1.5">
				<span class="block h-1 w-10/12 rounded-full {bar}"></span>
				<span class="block h-1 w-7/12 rounded-full {dot}"></span>
				<span class="block h-1 w-9/12 rounded-full {dot}"></span>
				<span class="block h-1 w-6/12 rounded-full {bar}"></span>
				<span class="block h-1 w-8/12 rounded-full {dot}"></span>

				<span class="mt-auto block h-2.5 w-full rounded-sm {chrome}"></span>
			</span>
		</span>
	</span>
{/snippet}
