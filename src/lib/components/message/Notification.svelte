<script lang="ts">
	import { UserMessage } from "$lib/models/message/user-message";
	import { colorizeName } from "$lib/util";
	import Confetti from "~icons/ph/confetti";
	import Fire from "~icons/ph/fire";
	import HandHeart from "~icons/ph/hand-heart";
	import Megaphone from "~icons/ph/megaphone";
	import Message from "./Message.svelte";
	import Sub from "./Sub.svelte";

	interface Props {
		message: UserMessage;
	}

	const { message }: Props = $props();

	const colors = $derived<Record<string, string[]>>({
		PRIMARY: [message.source.user.color, message.source.user.color],
		BLUE: ["#00d6d6", "#9146ff"],
		GREEN: ["#00db84", "#57bee6"],
		ORANGE: ["#ffb31a", "#e0e000"],
		PURPLE: ["#9146ff", "#ff75e6"],
	});

	function formatCurrency(value: number, code: string) {
		const formatter = new Intl.NumberFormat(navigator.languages, {
			style: "currency",
			currency: code,
		});

		return formatter.format(value);
	}
</script>

{#if message.event}
	{@const { type } = message.event}

	{#if type === "announcement"}
		{@const stops = colors[message.event.color]}

		<div
			class="my-1 border-x-4 [border-image-slice:1]"
			style:border-image-source="linear-gradient({stops[0]}, {stops[1]})"
		>
			<div class="flex items-center bg-muted px-2.5 py-1.5 text-xs font-medium">
				<Megaphone class="mr-2 -scale-x-100" /> Announcement
			</div>

			<div class="bg-muted/50 p-2">
				<Message {message} />
			</div>
		</div>
	{:else if type === "sub_or_resub" || type === "sub_mystery_gift" || type === "sub_gift" || type === "prime_paid_upgrade" || type === "gift_paid_upgrade"}
		<Sub {message} sub={message.event} />
	{:else}
		<div
			class="my-0.5 border-l-4 bg-muted/50 p-2"
			style:border-color={message.source.user.color}
		>
			{#if type === "bits_badge_tier"}
				<div class="flex gap-1">
					<Confetti class="mt-0.5 shrink-0" />

					<p>
						{@html colorizeName(message.author)}
						unlocked the {message.event.threshold} bits badge!
					</p>
				</div>

				{#if message.data.message_text}
					<div class="mt-2">
						<Message {message} />
					</div>
				{/if}
			{:else if type === "charity_donation"}
				{@const amount = message.event.donation_amount / 10 ** message.event.exponent}

				<div class="flex gap-1">
					<HandHeart class="mt-0.5 shrink-0" />

					<div class="flex flex-col gap-0.5">
						{@html colorizeName(message.author)}

						<p>
							Donated <span class="font-medium"
								>{formatCurrency(amount, message.event.donation_currency)}</span
							>
							to {message.event.charity_name}!
						</p>
					</div>
				</div>
			{:else if type === "standard_pay_forward"}
				{@const gifter = message.channel.viewers.get(message.event.prior_gifter.id)}
				{@const recipient = message.channel.viewers.get(message.event.recipient.id)}

				<p>
					{@html colorizeName(message.author)}
					is paying forward the gifted sub they received from

					{#if message.event.is_prior_gifter_anonymous}
						an anonymous gifter
					{:else if gifter}
						{@html colorizeName(gifter)}
					{:else}
						<span class="font-semibold">{message.event.prior_gifter.name}</span>
					{/if} to

					{#if recipient}
						{@html colorizeName(recipient)}
					{:else}
						<span class="font-semibold">{message.event.recipient.name}</span>
					{/if}!
				</p>
			{:else if type === "community_pay_forward"}
				{@const gifter = message.channel.viewers.get(message.event.gifter.id)}

				<p>
					{@html colorizeName(message.author)}
					is paying forward the gifted sub they received from

					{#if gifter}
						{@html colorizeName(gifter)}
					{:else}
						<span class="font-semibold">{message.event.gifter.name}</span>
					{/if}!
				</p>
			{:else if type === "raid"}
				<p class="inline">
					{@html colorizeName(message.author)}
					is raiding with {message.event.viewer_count}
					{message.event.viewer_count > 1 ? "viewers" : "viewer"}!
				</p>
			{:else if type === "unraid"}
				<p class="inline">
					{@html colorizeName(message.author)} canceled the raid.
				</p>
			{:else if type === "one_tap_gift_redeemed"}
				<p>
					{@html colorizeName(message.author)} redeemed
					<img
						class="mx-1 inline"
						title={message.event.gift_id}
						src="https://d3aqoihi2n8ty8.cloudfront.net/one-tap/{message.event
							.gift_id}/i/2.png"
						alt={message.event.gift_id}
						width="28"
						height="28"
						decoding="async"
						loading="lazy"
					/>
					for <span class="font-medium">{message.event.bits}</span> bits!
				</p>
			{:else if type === "watch_streak"}
				<div class="flex gap-1">
					<Fire class="mt-0.5 shrink-0" />

					<p>
						{@html colorizeName(message.author)}
						reached a <span class="font-medium">{message.event.streak}-stream</span> watch
						streak!
					</p>
				</div>

				{#if message.data.message_text}
					<div class="mt-2">
						<Message {message} />
					</div>
				{/if}
			{/if}
		</div>
	{/if}
{/if}
