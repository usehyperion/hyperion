<script lang="ts">
	import { Tween } from "svelte/motion";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { Label } from "$lib/components/ui/label";
	import { Progress } from "$lib/components/ui/progress";
	import CheckCircle from "~icons/ph/check-circle";

	const id = $props.id();

	const progress = new Tween(3, { duration: 3000 });
	progress.target = 0;

	$effect(() => {
		if (progress.current === 0) {
			goto(resolve("/auth/login"));
		}
	});
</script>

<div class="relative flex size-20 items-center justify-center rounded-full border bg-card">
	<CheckCircle class="size-10" />
</div>

<div class="space-y-2">
	<h1 class="text-2xl font-semibold">You've been logged out</h1>

	<p class="max-w-sm text-muted-foreground">
		Thanks for stopping by. Your session has been securely ended.
	</p>
</div>

<div class="flex flex-col items-center gap-y-4">
	<Label for={id}>
		<span class="text-sm text-muted-foreground">Redirecting to log in</span>

		<div
			class="inline-flex size-6 items-center justify-center rounded-full border bg-card font-mono text-xs"
		>
			{progress.current.toFixed(0)}
		</div>
	</Label>

	<Progress
		{id}
		class="*:data-[slot=progress-indicator]:transition-none"
		value={3 - progress.current}
		max={3}
	/>
</div>
