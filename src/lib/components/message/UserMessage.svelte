<script lang="ts">
	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import { app } from "#lib/app.svelte.js";
	import { highlightOf, matchesKeyword } from "#lib/highlights.js";
	import { IconRepliedTo } from "#lib/icons.js";
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
		settings.state["highlights.keywords"].find(
			(config) => config.enabled && matchesKeyword(message.text, config),
		),
	);

	const hlType = $derived(highlightOf(message.text, message.viewer, app.user?.username));
	const jumpedTo = $derived(message.channel.chat.jumpTarget?.id === message.id);

	function getSuspicionInfo() {
		if (!message.viewer.suspicious) return;

		if (message.viewer.monitored) return "Monitoring";
		if (message.viewer.restricted) return "Restricted";
		if (message.viewer.possibleBanEvader) return "Possible Ban Evader";
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={["message group relative", jumpedTo ? "bg-accent/20" : "transition-colors duration-500"]}
	aria-disabled={message.deleted}
	data-deleted={deletedAppearance(message)}
	data-action={message.action || undefined}
	oncontextmenu={(event) => openMenu(event, () => createMessageMenu(message))}
>
	{#if !message.deleted && !message.channel.banned}
		<QuickActions class="absolute top-0 right-2 z-10 -translate-y-1/2" {message} />
	{/if}

	{#if message.redemption}
		<Redemption reward={message.redemption} {message} />
	{:else if message.highlighted}
		<Callout class="highlighted" color={message.source.user.color}>
			<Message {message} />
		</Callout>
	{:else if settings.state["highlights.enabled"]}
		{@const config = hlType ? settings.state["highlights.viewers"][hlType] : null}

		{#if config && config.enabled}
			<Highlight type={hlType!} info={getSuspicionInfo()} {config}>
				{@render content(config.style !== "background")}
			</Highlight>
		{:else if customMatched && message.author.id !== app.user?.id}
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
	<div
		class={[
			"message-body py-2 not-group-aria-disabled:hover:bg-tint",
			bordered ? "px-1.5" : "px-3",
		]}
	>
		{#if message.reply}
			{@const viewer = message.channel.viewers.get(message.reply.parent.user.id)}

			{@const parentId = message.reply.parent.message_id}
			{@const inChat = message.channel.chat.has(parentId)}

			<button
				class="reply group/reply mb-0.5 flex w-full items-center gap-2 text-left enabled:cursor-pointer"
				type="button"
				title={inChat ? "Jump to message" : undefined}
				disabled={!inChat}
				onclick={() => message.channel.chat.jumpTo(parentId)}
			>
				<IconRepliedTo class="ml-1 shrink-0 scale-x-125 text-fg-muted" />

				<div class="line-clamp-1 text-detail">
					<span style={viewer?.user.mentionStyle}>
						@{message.reply.parent.user.name}
					</span>:

					<p
						class="reply-text inline text-fg-muted transition-colors group-enabled/reply:group-hover/reply:text-fg"
					>
						{message.reply.parent.message_text}
					</p>
				</div>
			</button>
		{/if}

		<Message {message} />
	</div>
{/snippet}
