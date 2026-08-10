<script lang="ts">
	import { RadioGroup } from "bits-ui";
	import { setMode, userPrefersMode } from "mode-watcher";

	const themes = [
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
		{ value: "system", label: "System" },
	] as const;
</script>

<div class="@container">
	<RadioGroup.Root
		class="grid gap-3 @max-md:max-w-3xs @min-md:grid-cols-3"
		bind:value={() => userPrefersMode.current, (value) => setMode(value)}
	>
		{#each themes as theme (theme.value)}
			<RadioGroup.Item
				class="cursor-pointer overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:ring-1 data-[state=checked]:ring-primary"
				value={theme.value}
			>
				{#snippet children({ checked })}
					<div class="aspect-4/3 w-full border-b">
						{#if theme.value === "system"}
							<div class="relative size-full">
								<div class="absolute inset-0 [clip-path:inset(0_50%_0_0)]">
									{@render shell(false)}
								</div>

								<div class="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
									{@render shell(true)}
								</div>
							</div>
						{:else}
							{@render shell(theme.value === "dark")}
						{/if}
					</div>

					<div class="flex items-center gap-2 px-3 py-2.5">
						<span
							class={[
								"flex size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-xs",
								checked && "border-primary",
							]}
						>
							{#if checked}
								<span class="size-2 rounded-full bg-primary"></span>
							{/if}
						</span>

						<span class="text-sm font-medium">{theme.label}</span>
					</div>
				{/snippet}
			</RadioGroup.Item>
		{/each}
	</RadioGroup.Root>
</div>

{#snippet shell(dark: boolean)}
	{@const surface = dark ? "bg-neutral-950" : "bg-white"}
	{@const chrome = dark ? "bg-neutral-900" : "bg-neutral-100"}
	{@const bar = dark ? "bg-neutral-700" : "bg-neutral-300"}
	{@const dot = dark ? "bg-neutral-800" : "bg-neutral-200"}

	<div class="flex size-full flex-col {surface}">
		<div class="flex shrink-0 items-center gap-1 px-1.5 py-1.5 {chrome}">
			<div class="h-1 w-4 rounded-full {bar}"></div>
			<div class="h-1 w-3 rounded-full {bar}"></div>
			<div class="ml-auto h-1 w-1 rounded-full {bar}"></div>
		</div>

		<div class="flex min-h-0 flex-1">
			<div class="flex shrink-0 flex-col items-center gap-1 px-1 py-1.5 {chrome}">
				<div class="size-2 rounded-full {bar}"></div>
				<div class="size-2 rounded-full {dot}"></div>
				<div class="size-2 rounded-full {dot}"></div>
			</div>

			<div class="flex min-w-0 flex-1 flex-col gap-1 p-1.5">
				<div class="h-1 w-10/12 rounded-full {bar}"></div>
				<div class="h-1 w-7/12 rounded-full {dot}"></div>
				<div class="h-1 w-9/12 rounded-full {dot}"></div>
				<div class="h-1 w-6/12 rounded-full {bar}"></div>
				<div class="h-1 w-8/12 rounded-full {dot}"></div>

				<div class="mt-auto h-2.5 w-full rounded-sm {chrome}"></div>
			</div>
		</div>
	</div>
{/snippet}
