<script lang="ts">
	import dayjs from "dayjs";

	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { Stream } from "#lib/models/stream.svelte.js";

	import { everySecond } from "#lib/clock.js";
	import { IconUptime } from "#lib/icons.js";

	import Tooltip from "../ui/Tooltip.svelte";
	import GuestList from "./GuestList.svelte";
	import StreamInfo from "./StreamInfo.svelte";
	import ViewerList from "./ViewerList.svelte";

	interface Props {
		channel: Channel;
		stream: Stream;
	}

	const { channel, stream }: Props = $props();

	let header = $state<HTMLElement | null>(null);

	const uptime = $derived.by(() => {
		const diff = dayjs.duration(everySecond.now - stream.createdAt.getTime());
		const hours = Math.floor(diff.asHours()).toString().padStart(2, "0");

		return `${hours}:${diff.format("mm:ss")}`;
	});

	const started = $derived.by(() => {
		const date = dayjs(stream.createdAt);

		return date.format(
			date.isSame(dayjs(), "day") ? "[Started at] LT" : "[Started] MMM D [at] LT",
		);
	});
</script>

<header
	class="@container flex h-8 shrink-0 items-center gap-0.5 border-b border-line bg-surface-2 px-1 text-detail"
	bind:this={header}
>
	<StreamInfo {stream} anchor={header} />

	{#if stream.guests.size}
		<GuestList {channel} />
	{/if}

	<Tooltip type="description" side="bottom">
		{#snippet trigger(props)}
			<div
				{...props}
				class="hidden h-6 shrink-0 items-center gap-1 rounded-control px-1.5 text-fg-muted tabular-nums @2xs:flex"
			>
				<IconUptime class="size-3.5 text-fg-faint" aria-hidden="true" />

				<span class="sr-only">Uptime</span>
				{uptime}
			</div>
		{/snippet}

		{started}
	</Tooltip>

	<ViewerList {channel} />
</header>
