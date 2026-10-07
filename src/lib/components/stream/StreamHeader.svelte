<script lang="ts">
	import NumberFlow from "@number-flow/svelte";
	import dayjs from "dayjs";
	import duration from "dayjs/plugin/duration";
	import { onDestroy } from "svelte";

	import Clock from "~icons/ph/clock";
	import Users from "~icons/ph/users";

	import type { Stream } from "#lib/models/stream.svelte.js";

	dayjs.extend(duration);

	interface Props {
		stream: Stream;
	}

	const { stream }: Props = $props();

	let uptime = $state(getUptime());

	let interval: ReturnType<typeof setInterval> | undefined;

	const timeout = setTimeout(() => {
		interval = setInterval(() => {
			uptime = getUptime();
		}, 1000);
	}, 1000 - new Date().getMilliseconds());

	onDestroy(() => {
		clearTimeout(timeout);
		clearInterval(interval);
	});

	function getUptime() {
		const diff = dayjs.duration(dayjs().diff(dayjs(stream.createdAt)));
		const hours = Math.floor(diff.asHours()).toString().padStart(2, "0");

		return `${hours}:${diff.format("mm:ss")}`;
	}
</script>

<div
	class="flex items-center justify-between overflow-hidden border-b p-2 text-xs text-muted-foreground shadow"
	data-component="stream-header"
>
	<p class="truncate" title={stream.title} data-slot="stream-header-title">{stream.title}</p>

	<div class="ml-[3ch] flex items-center gap-x-2.5" data-slot="stream-header-stats">
		<div class="flex items-center" data-slot="stream-header-viewers">
			<Users class="mr-1" />
			<NumberFlow class="tabular-nums" value={stream.viewers} />
		</div>

		<div class="flex items-center" data-slot="stream-header-uptime">
			<Clock class="mr-1" />
			<span class="tabular-nums">{uptime}</span>
		</div>
	</div>
</div>
