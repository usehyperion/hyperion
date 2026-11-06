<script lang="ts">
	import Clock from "~icons/ph/clock";
	import PushPin from "~icons/ph/push-pin";
	import PushPinSlash from "~icons/ph/push-pin-slash";

	import type { Pin } from "#lib/models/pin.svelte.js";

	import { everySecond } from "#lib/clock.js";
	import { dialogs } from "#lib/dialog.js";
	import { clamp } from "#lib/util/math.js";
	import { formatDuration } from "#lib/util/time.js";

	import Message from "../message/Message.svelte";
	import Username from "../user/Username.svelte";
	import NoticeAction, { details, hide } from "./NoticeAction.svelte";
	import PinDurationDialog from "./PinDurationDialog.svelte";

	interface Props {
		pin: Pin;
	}

	const { pin }: Props = $props();

	let expanded = $state(true);

	const remaining = $derived(Math.max(0, (pin.expirationTimestamp ?? 0) - everySecond.now));
	const fraction = $derived(pin.duration ? clamp(0, remaining / (pin.duration * 1000), 1) : 0);
</script>

<div class="relative p-2 text-sm">
	<div class="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
		<PushPin class="size-3" />

		<span>Pinned by <Username user={pin.pinner} /></span>

		<div class="ml-auto flex items-center gap-0.5">
			{#if pin.message.channel.isMod}
				<NoticeAction
					icon={Clock}
					tooltip="Change duration"
					command="show-modal"
					commandfor={dialogs.pinDuration(pin.message.id)}
				/>

				<NoticeAction icon={PushPinSlash} tooltip="Unpin" onclick={() => pin.unpin()} />
			{/if}

			{@render details(expanded, () => (expanded = !expanded))}
			{@render hide(() => (pin.hidden = true))}
		</div>
	</div>

	{#if expanded}
		<Message message={pin.message} nested />
	{/if}

	{#if pin.duration !== null}
		<div
			class="absolute inset-x-0 bottom-0 h-0.5 bg-muted"
			role="timer"
			aria-label="{formatDuration(Math.ceil(remaining / 1000))} remaining"
		>
			<div
				class="h-full bg-primary transition-[width] duration-1000 ease-linear"
				style:width="{fraction * 100}%"
			></div>
		</div>
	{/if}
</div>

<PinDurationDialog {pin} />
