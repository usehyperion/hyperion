<script lang="ts">
	import dayjs from "dayjs";
	import duration from "dayjs/plugin/duration";
	import { onDestroy } from "svelte";
	import Clock from "~icons/ph/clock";
	import Users from "~icons/ph/users";
	import type { Stream } from "$lib/models/stream.svelte";

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
	class="text-muted-foreground flex items-center justify-between overflow-hidden border-b p-2 text-xs shadow"
>
	<p class="truncate" title={stream.title}>{stream.title}</p>

	<div class="ml-[3ch] flex items-center gap-x-2.5">
		<div class="flex items-center">
			<Users class="mr-1" />
			<span>{stream.viewers}</span>
		</div>

		<div class="flex items-center">
			<Clock class="mr-1" />
			<span class="tabular-nums">{uptime}</span>
		</div>
	</div>
</div>
