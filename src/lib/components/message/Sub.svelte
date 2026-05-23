<script lang="ts">
	import type { UserMessage } from "$lib/models/message/user-message";
	import type {
		GiftPaidUpgradeEvent,
		PrimePaidUpgradeEvent,
		SubGiftEvent,
		SubMysteryGiftEvent,
		SubOrResubEvent,
	} from "$lib/twitch/irc";
	import { colorizeName } from "$lib/util";
	import PrimeCrown from "~icons/local/prime-crown";
	import Gift from "~icons/ph/gift";
	import Star from "~icons/ph/star-fill";
	import Message from "./Message.svelte";

	interface Props {
		message: UserMessage;
		sub:
			| SubOrResubEvent
			| SubMysteryGiftEvent
			| SubGiftEvent
			| PrimePaidUpgradeEvent
			| GiftPaidUpgradeEvent;
	}

	const { message, sub }: Props = $props();
</script>

<div class="my-0.5 border-l-4 bg-muted/50 p-2" style:border-color={message.source.user.color}>
	<div class="flex gap-1">
		{#if sub.type === "sub_or_resub" || sub.type === "prime_paid_upgrade" || sub.type === "gift_paid_upgrade"}
			{#if sub.type === "sub_or_resub" && sub.sub_plan === "Prime"}
				<PrimeCrown class="fill-current" />
			{:else}
				<Star class="mt-0.5 shrink-0" />
			{/if}
		{:else}
			<Gift class="mt-px shrink-0" />
		{/if}

		{#if sub.type === "sub_or_resub"}
			{@const isMultimonth =
				sub.multimonth_tenure === 0 &&
				sub.multimonth_duration &&
				sub.multimonth_duration > 1}

			<div class="flex flex-col gap-0.5">
				{@html colorizeName(message.author)}

				<p>
					Subscribed with

					{#if sub.sub_plan === "Prime"}
						<a href="https://gaming.amazon.com/home" target="_blank">Prime</a>
					{:else}
						<span class="font-semibold">Tier {sub.sub_plan[0]}</span>
					{/if}{#if !isMultimonth && !message.shared}.{/if}

					{#if isMultimonth}
						for
						<span class="font-semibold">
							{sub.multimonth_duration} months
						</span>
						in advance{#if !message.shared}.{/if}
					{/if}

					{#if message.shared}
						to {@html colorizeName(message.source.user)}.
					{/if}

					{#if sub.cumulative_months > 1}
						They've subscribed for
						<span class="font-semibold">{sub.cumulative_months} months</span
						>{#if sub.streak_months}
							, currently on a
							<span class="font-semibold">{sub.streak_months} month</span>
							streak
						{/if}!
					{/if}
				</p>
			</div>
		{:else if sub.type === "sub_mystery_gift"}
			{@const singular = sub.mass_gift_count === 1}

			<div class="flex flex-col gap-0.5">
				{@html colorizeName(message.author)}

				<p>
					Gifted
					{singular ? "a" : sub.mass_gift_count}
					<span class="font-semibold"> Tier {sub.sub_plan[0]}</span>
					sub{singular ? null : "s"}{#if !message.shared}!{/if}

					{#if message.shared}
						to {@html colorizeName(message.source.user)}'s community!
					{/if}

					{#if sub.sender_total_gifts && sub.sender_total_gifts > sub.mass_gift_count}
						They've gifted a total of
						<span class="font-semibold">{sub.sender_total_gifts} subs</span> to the channel.
					{/if}
				</p>
			</div>
		{:else if sub.type === "prime_paid_upgrade"}
			<div class="flex flex-col gap-0.5">
				{@html colorizeName(message.author)}

				<p>
					Converted their <a href="https://gaming.amazon.com/home" target="_blank">
						Prime
					</a>
					sub to a
					<span class="font-semibold">Tier {sub.sub_plan[0]}</span> sub!
				</p>
			</div>
		{:else if sub.type === "gift_paid_upgrade"}
			{@const gifter = message.channel.viewers
				.values()
				.find((v) => v.username === sub.gifter_login)}

			<div class="flex flex-col gap-0.5">
				{@html colorizeName(message.author)}

				<p>
					Continued the gifted sub they got from {#if gifter}
						{@html colorizeName(gifter)}
					{:else}
						<span class="font-semibold">{sub.gifter_name}</span>
					{/if}
				</p>
			</div>
		{:else}
			{@const recipient = message.channel.viewers.get(sub.recipient.id)}

			{#snippet tier()}
				<span class="font-semibold">Tier {sub.sub_plan[0]}</span>
			{/snippet}

			<p>
				{#if sub.is_sender_anonymous}
					<span class="font-semibold">An anonymous viewer</span>
				{:else}
					{@html colorizeName(message.author)}
				{/if}

				gifted {#if sub.num_gifted_months > 1}
					{sub.num_gifted_months} months of a {@render tier()} sub
				{:else}
					a {@render tier()} sub
				{/if}

				to {#if recipient}
					{@html colorizeName(recipient)}
				{:else}
					<span class="font-semibold">{sub.recipient.name}</span>
				{/if}{#if !message.shared}!{/if}

				{#if message.shared}
					in {@html colorizeName(message.source.user)}'s channel!
				{/if}

				{#if sub.sender_total_months > sub.num_gifted_months}
					They've gifted a total of
					<span class="font-semibold">{sub.sender_total_months} months</span>
					of subs to the channel.
				{/if}
			</p>
		{/if}
	</div>

	{#if message.data.message_text}
		<div class="mt-2">
			<Message {message} />
		</div>
	{/if}
</div>
