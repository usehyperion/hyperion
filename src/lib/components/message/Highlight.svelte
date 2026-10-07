<script lang="ts" module>
	import At from "~icons/ph/at";
	import Highlighter from "~icons/ph/highlighter";
	import Repeat from "~icons/ph/repeat";
	import ShieldWarning from "~icons/ph/shield-warning";
	import SketchLogo from "~icons/ph/sketch-logo";
	import Sparkle from "~icons/ph/sparkle";
	import Star from "~icons/ph/star-fill";
	import Sword from "~icons/ph/sword";
	import VideoCamera from "~icons/ph/video-camera";

	export const decorations = {
		mention: { icon: At, label: "Mention" },
		new: { icon: Sparkle, label: "First Time Chat" },
		returning: { icon: Repeat, label: "Returning Chatter" },
		suspicious: { icon: ShieldWarning, label: "Suspicious User" },
		broadcaster: { icon: VideoCamera, label: "Broadcaster" },
		moderator: { icon: Sword, label: "Moderator" },
		subscriber: { icon: Star, label: "Subscriber" },
		vip: { icon: SketchLogo, label: "VIP" },
		custom: { icon: Highlighter, label: "Custom" },
	};
</script>

<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "tailwind-variants";

	import CaseSensitive from "~icons/local/case-sensitive";
	import Regex from "~icons/local/regex";
	import WholeWord from "~icons/local/whole-word";

	import type {
		HighlightConfig,
		HighlightType,
		KeywordHighlightConfig,
	} from "#lib/settings/index.js";

	type Props = {
		children: Snippet;
		class?: string;
	} & (
		| {
				type: HighlightType;
				config: HighlightConfig;
				info?: string;
		  }
		| {
				type: "custom";
				config: KeywordHighlightConfig;
				info?: never;
		  }
	);

	const { children, class: className, type, config, info }: Props = $props();

	const decoration = $derived(decorations[type]);
</script>

{#if config.style === "background"}
	<div
		class={cn("bg-(--highlight)/30", className)}
		style:--highlight={config.color}
		data-component="message-highlight"
		data-type={type}
		data-style={config.style}
	>
		{@render children()}
	</div>
{:else}
	<div
		class={cn("m-1 box-border overflow-hidden rounded-md border", className)}
		style:border-color={config.color}
		data-component="message-highlight"
		data-type={type}
		data-style={config.style}
	>
		{#if config.style === "default"}
			<div
				class="flex items-center bg-muted px-2.5 py-1.5 text-xs font-medium"
				data-slot="message-highlight-header"
			>
				<div class="flex items-center" data-slot="message-highlight-label">
					<decoration.icon class="mr-2 size-4" data-slot="message-highlight-icon" />

					{decoration.label}

					{#if info}
						({info})
					{/if}
				</div>

				{#if type === "custom"}
					<div
						class="ml-auto flex items-center gap-2.5"
						data-slot="message-highlight-flags"
					>
						{#if config.matchCase}
							<CaseSensitive class="size-4" />
						{/if}

						{#if config.wholeWord}
							<WholeWord class="size-4" />
						{/if}

						{#if config.regex}
							<Regex class="size-4" />
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{@render children()}
	</div>
{/if}
