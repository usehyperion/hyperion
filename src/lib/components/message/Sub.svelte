<script lang="ts">
	import PrimeCrown from "~icons/local/prime-crown";
	import Gift from "~icons/ph/gift";
	import Star from "~icons/ph/star-fill";

	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";
	import type {
		GiftPaidUpgradeEvent,
		PrimePaidUpgradeEvent,
		SubGiftEvent,
		SubMysteryGiftEvent,
		SubOrResubEvent,
	} from "#lib/twitch/irc.js";

	import Username from "../user/Username.svelte";
	import Callout from "./Callout.svelte";
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

<Callout color={message.source.user.color}>
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
				<Username user={message.author} />

				<p>
					Subscribed with

					{#if sub.sub_plan === "Prime"}
						{@render prime()}
					{:else}
						{@render tier(sub.sub_plan)}
					{/if}{#if !isMultimonth && !message.shared}.{/if}

					{#if isMultimonth}
						for
						<span class="font-semibold">
							{sub.multimonth_duration} months
						</span>
						in advance{#if !message.shared}.{/if}
					{/if}

					{#if message.shared}
						to <Username user={message.source.user} />.
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
				<Username user={message.author} />

				<p>
					Gifted
					{singular ? "a" : sub.mass_gift_count}
					{@render tier(sub.sub_plan)}
					sub{singular ? null : "s"}{#if !message.shared}!{/if}

					{#if message.shared}
						to <Username user={message.source.user} />'s community!
					{/if}

					{#if sub.sender_total_gifts && sub.sender_total_gifts > sub.mass_gift_count}
						They've gifted a total of
						<span class="font-semibold">{sub.sender_total_gifts} subs</span> to the channel.
					{/if}
				</p>
			</div>
		{:else if sub.type === "prime_paid_upgrade"}
			<div class="flex flex-col gap-0.5">
				<Username user={message.author} />

				<p>
					Converted their {@render prime()} sub to a {@render tier(sub.sub_plan)} sub!
				</p>
			</div>
		{:else if sub.type === "gift_paid_upgrade"}
			{@const gifter = message.channel.viewers
				.values()
				.find((v) => v.username === sub.gifter_login)}

			<div class="flex flex-col gap-0.5">
				<Username user={message.author} />

				<p>
					Continued the gifted sub they got from
					<Username user={gifter?.user} name={sub.gifter_name} />
				</p>
			</div>
		{:else}
			{@const recipient = message.channel.viewers.get(sub.recipient.id)}

			<p>
				{#if sub.is_sender_anonymous}
					<span class="font-semibold">An anonymous viewer</span>
				{:else}
					<Username user={message.author} />
				{/if}

				gifted {#if sub.num_gifted_months > 1}
					{sub.num_gifted_months} months of a {@render tier(sub.sub_plan)} sub
				{:else}
					a {@render tier(sub.sub_plan)} sub
				{/if}

				to <Username
					user={recipient?.user}
					name={sub.recipient.name}
				/>{#if !message.shared}!{/if}

				{#if message.shared}
					in <Username user={message.source.user} />'s channel!
				{/if}

				{#if sub.sender_total_months > sub.num_gifted_months}
					They've gifted a total of
					<span class="font-semibold">{sub.sender_total_months} months</span>
					of subs to the channel.
				{/if}
			</p>
		{/if}
	</div>

	{#if message.text}
		<div class="mt-2">
			<Message {message} />
		</div>
	{/if}
</Callout>

{#snippet tier(plan: string)}
	<span class="font-semibold">Tier {plan[0]}</span>
{/snippet}

{#snippet prime()}
	<a href="https://gaming.amazon.com/home" target="_blank">Prime</a>
{/snippet}
