<script lang="ts">
	import { app } from "$lib/app.svelte";
	import { createMessageMenu } from "$lib/menus/message-menu";
	import type { UserMessage } from "$lib/models/message/user-message";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { settings } from "$lib/settings";
	import { openMenu } from "$lib/util";
	import ArrowBendUpRight from "~icons/ph/arrow-bend-up-right";
	import Highlight from "./Highlight.svelte";
	import Message from "./Message.svelte";
	import QuickActions from "./QuickActions.svelte";

	interface Props {
		message: UserMessage;
	}

	const { message }: Props = $props();

	const customMatched = $derived(
		settings.state["highlights.keywords"].find((cfg) => {
			if (!cfg.pattern.trim()) return false;

			let pattern = cfg.regex ? cfg.pattern : RegExp.escape(cfg.pattern);

			if (cfg.wholeWord) {
				pattern = `\\b${pattern}\\b`;
			}

			return new RegExp(pattern, cfg.matchCase ? "g" : "gi").test(message.text);
		}),
	);

	const hlType = $derived.by(() => {
		const hasMention = message.text.toLowerCase().includes(`@${app.user?.username}`);
		if (hasMention) return "mention";

		if (message.viewer?.new) return "new";
		if (message.viewer?.returning) return "returning";
		if (message.viewer?.broadcaster) return "broadcaster";
		if (message.viewer?.moderator) return "moderator";
		if (message.viewer?.suspicious) return "suspicious";
		if (message.viewer?.vip) return "vip";
		if (message.viewer?.subscriber) return "subscriber";
	});

	function getSuspicionInfo() {
		if (!message.viewer?.suspicious) return;

		const likelihood = message.viewer.banEvasion;

		if (message.viewer.monitored) return "Monitoring";
		if (message.viewer.restricted) return "Restricted";

		if (likelihood !== "unknown") {
			const status = likelihood[0].toUpperCase() + likelihood.slice(1);
			return `${status} Ban Evader`;
		}
	}

	function getMentionStyle(viewer?: Viewer) {
		if (!viewer) return null;

		switch (settings.state["chat.usernames.mentionStyle"]) {
			case "none":
				return null;
			case "colored":
				return `color: ${viewer.user.color}`;
			case "painted":
				return viewer.user.style;
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative aria-disabled:opacity-50"
	aria-disabled={message.deleted}
	oncontextmenu={(event) => openMenu(event, () => createMessageMenu(message))}
>
	{#if !message.deleted && !app.user?.banned.has(message.channel.id)}
		<QuickActions
			class="absolute top-0 right-2 -translate-y-1/2 not-group-hover:hidden"
			{message}
		/>
	{/if}

	{#if message.highlighted}
		<div
			class="my-0.5 border-l-4 bg-muted/50 p-2"
			style:border-color={message.source.user.color}
		>
			<Message {message} />
		</div>
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
					<span style={getMentionStyle(viewer)}>
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
