<script lang="ts">
	import NumberFlow from "@number-flow/svelte";
	import dayjs from "dayjs";

	import Clock from "~icons/ph/clock";
	import Users from "~icons/ph/users";

	import type { Stream } from "#lib/models/stream.svelte.js";

	import { everySecond } from "#lib/clock.js";

	import StreamInfo from "./StreamInfo.svelte";

	interface Props {
		stream: Stream;
	}

	const { stream }: Props = $props();

	let header = $state<HTMLElement | null>(null);

	const uptime = $derived.by(() => {
		const diff = dayjs.duration(everySecond.now - stream.createdAt.getTime());
		const hours = Math.floor(diff.asHours()).toString().padStart(2, "0");

		return `${hours}:${diff.format("mm:ss")}`;
	});
</script>

<div class="flex items-center divide-x divide-border border-b shadow" bind:this={header}>
	<div
		class="flex h-8 min-w-0 flex-1 items-center justify-between overflow-hidden px-2 text-xs text-muted-foreground"
	>
		<p class="truncate" title={stream.title}>{stream.title}</p>

		<div class="ml-[3ch] flex items-center gap-x-2.5">
			<div class="flex items-center">
				<Users class="mr-1" />
				<NumberFlow class="tabular-nums" value={stream.viewers} />
			</div>

			<div class="flex items-center">
				<Clock class="mr-1" />
				<span class="tabular-nums">{uptime}</span>
			</div>
		</div>
	</div>

	<StreamInfo {stream} anchor={header} />
</div>
