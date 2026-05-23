<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HighlightConfig, HighlightType, KeywordHighlightConfig } from "$lib/settings";
	import { cn } from "$lib/util";
	import CaseSensitive from "~icons/local/case-sensitive";
	import Regex from "~icons/local/regex";
	import WholeWord from "~icons/local/whole-word";
	import At from "~icons/ph/at";
	import Highlighter from "~icons/ph/highlighter";
	import Repeat from "~icons/ph/repeat";
	import ShieldWarning from "~icons/ph/shield-warning";
	import SketchLogo from "~icons/ph/sketch-logo";
	import Sparkle from "~icons/ph/sparkle";
	import Star from "~icons/ph/star-fill";
	import Sword from "~icons/ph/sword";
	import VideoCamera from "~icons/ph/video-camera";

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

	const decorations = {
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

	const decoration = $derived(decorations[type]);
</script>

{#if config.style === "background"}
	<div class={cn("bg-(--highlight)/30", className)} style:--highlight={config.color}>
		{@render children()}
	</div>
{:else}
	<div
		class={cn("m-1 box-border overflow-hidden rounded-md border", className)}
		style:border-color={config.color}
	>
		{#if config.style === "default"}
			<div class="flex items-center bg-muted px-2.5 py-1.5 text-xs font-medium">
				<div class="flex items-center">
					<decoration.icon class="mr-2 size-4" />

					{decoration.label}

					{#if info}
						({info})
					{/if}
				</div>

				{#if type === "custom"}
					<div class="ml-auto flex items-center gap-2.5">
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
