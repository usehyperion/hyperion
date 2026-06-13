<script lang="ts">
	import type { Component } from "svelte";
	import type { Pin } from "$lib/models/pin.svelte";
	import { clamp, colorizeName, formatDuration } from "$lib/util";
	import CaretDown from "~icons/ph/caret-down";
	import CaretUp from "~icons/ph/caret-up";
	import Clock from "~icons/ph/clock";
	import PushPin from "~icons/ph/push-pin";
	import PushPinSlash from "~icons/ph/push-pin-slash";
	import X from "~icons/ph/x";
	import Message from "../message/Message.svelte";
	import { Button } from "../ui/button";
	import * as Tooltip from "../ui/tooltip";
	import PinDurationDialog from "./PinDurationDialog.svelte";

	interface Props {
		pin: Pin;
	}

	const { pin }: Props = $props();

	let durationOpen = $state(false);
	let expanded = $state(true);

	let now = $state(Date.now());

	$effect(() => {
		if (pin.expirationTimestamp === null) return;

		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const remaining = $derived(
		pin.expirationTimestamp ? Math.max(0, pin.expirationTimestamp - now) : 0,
	);
	const fraction = $derived(pin.duration ? clamp(0, remaining / (pin.duration * 1000), 1) : 0);
</script>

<div
	class="absolute inset-x-2 top-2 z-10 overflow-hidden rounded-md border bg-background p-2 text-sm"
>
	<div class="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
		<PushPin class="size-3" />
		<p>Pinned by {@html colorizeName(pin.pinner)}</p>

		<div class="ml-auto flex items-center gap-0.5">
			{#if pin.message.channel.isMod}
				{@render button({
					tooltip: "Change duration",
					icon: Clock,
					onclick: () => (durationOpen = true),
				})}

				{@render button({
					tooltip: "Unpin",
					icon: PushPinSlash,
					onclick: () => pin.unpin(),
				})}
			{/if}

			{@render button({
				tooltip: expanded ? "Collapse" : "Expand",
				icon: expanded ? CaretUp : CaretDown,
				onclick: () => (expanded = !expanded),
			})}

			{@render button({
				tooltip: "Hide",
				icon: X,
				onclick: () => (pin.hidden = true),
			})}
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

<PinDurationDialog {pin} bind:open={durationOpen} />

{#snippet button(props: { icon: Component; tooltip: string; onclick: () => void })}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props: childProps })}
				<Button
					{...childProps}
					class="size-5 [&_svg]:size-3.5"
					size="icon-sm"
					variant="ghost"
					aria-label={props.tooltip}
					onclick={props.onclick}
				>
					<props.icon />
				</Button>
			{/snippet}
		</Tooltip.Trigger>

		<Tooltip.Content side="top">
			{props.tooltip}
		</Tooltip.Content>
	</Tooltip.Root>
{/snippet}
