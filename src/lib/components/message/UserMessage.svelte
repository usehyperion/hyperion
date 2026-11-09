<script lang="ts">
	import ArrowBendUpRight from "~icons/ph/arrow-bend-up-right";

	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import { app } from "#lib/app.svelte.js";
	import { highlightOf, matchesKeyword } from "#lib/highlights.js";
	import { createMessageMenu } from "#lib/menus/message-menu.js";
	import { deletedAppearance, settings } from "#lib/settings.js";
	import { openMenu } from "#lib/util/index.js";

	import Callout from "./Callout.svelte";
	import Highlight from "./Highlight.svelte";
	import Message from "./Message.svelte";
	import QuickActions from "./QuickActions.svelte";
	import Redemption from "./Redemption.svelte";

	interface Props {
		message: UserMessage;
	}

	const { message }: Props = $props();

	const customMatched = $derived(
		settings.state["highlights.keywords"].find((config) =>
			matchesKeyword(message.text, config),
		),
	);

	const hlType = $derived(highlightOf(message.text, message.viewer, app.user?.username));

	function getSuspicionInfo() {
		if (!message.viewer.suspicious) return;

		if (message.viewer.monitored) return "Monitoring";
		if (message.viewer.restricted) return "Restricted";
		if (message.viewer.possibleBanEvader) return "Possible Ban Evader";
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative"
	aria-disabled={message.deleted}
	data-deleted={deletedAppearance(message)}
	oncontextmenu={(event) => openMenu(event, () => createMessageMenu(message))}
>
	{#if !message.deleted && !message.channel.banned}
		<QuickActions class="absolute top-0 right-2 z-10 -translate-y-1/2" {message} />
	{/if}

	{#if message.redemption}
		<Redemption reward={message.redemption} {message} />
	{:else if message.highlighted}
		<Callout color={message.source.user.color}>
			<Message {message} />
		</Callout>
	{:else if settings.state["highlights.enabled"]}
		{@const config = hlType ? settings.state["highlights.viewers"][hlType] : null}

		{#if config && config.enabled}
			<Highlight type={hlType!} info={getSuspicionInfo()} {config}>
				{@render content(config.style !== "background")}
			</Highlight>
		{:else if customMatched?.enabled && message.author.id !== app.user?.id}
			<Highlight type="custom" config={customMatched}>
				{@render content(customMatched.style !== "background")}
			</Highlight>
		{:else}
			{@render content(false)}
		{/if}
	{:else}
		{@render content(false)}
	{/if}
</div>

{#snippet content(bordered: boolean)}
	<div class={["py-2 not-group-aria-disabled:hover:bg-muted/50", bordered ? "px-1.5" : "px-3"]}>
		{#if message.reply}
			{@const viewer = message.channel.viewers.get(message.reply.parent.user.id)}

			<div class="mb-0.5 flex items-center gap-2">
				<ArrowBendUpRight class="ml-1 shrink-0 scale-x-125 text-muted-foreground" />

				<div class="line-clamp-1 text-xs">
					<span style={viewer?.user.mentionStyle}>
						@{message.reply.parent.user.name}
					</span>:

					<p class="inline text-muted-foreground">
						{message.reply.parent.message_text}
					</p>
				</div>
			</div>
		{/if}

		<Message {message} />
	</div>
{/snippet}
