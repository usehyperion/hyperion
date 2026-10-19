import { tick } from "svelte";
import type { Attachment } from "svelte/attachments";
import { on } from "svelte/events";

import { log } from "#lib/log.js";

export interface ScrollableHistory<T> {
	/**
	 * The loaded messages, oldest first.
	 */
	readonly messages: readonly T[];
	readonly hasOlder: boolean;
	loadOlder(): Promise<void>;
}

export interface ScrollHistoryOptions {
	/**
	 * The distance from the top in pixels at which older messages are loaded.
	 *
	 * @default 200
	 */
	threshold?: number;
}

export function scrollHistory<T>(
	history: ScrollableHistory<T>,
	{ threshold = 200 }: ScrollHistoryOptions = {},
): Attachment<HTMLElement> {
	return (element) => {
		let atBottom = true;
		let visible = false;
		let loading = false;

		function scrollToBottom() {
			element.scrollTo(0, element.scrollHeight);
		}

		async function loadOlder() {
			if (loading || !history.hasOlder || element.scrollTop > threshold) return;

			loading = true;

			try {
				const height = element.scrollHeight;

				await history.loadOlder();
				await tick();

				// Keep the current messages in place as older ones are prepended.
				element.scrollTop += element.scrollHeight - height;
			} catch (error) {
				void log.error(`Failed to load older messages: ${String(error)}`).catch(() => {});
			} finally {
				loading = false;
			}
		}

		// Elements can't be scrolled while hidden, e.g. inside a closed popover,
		// so start at the newest message whenever the list is shown and stay
		// there through resizes.
		const observer = new ResizeObserver(() => {
			const shown = element.offsetHeight > 0;

			if (shown && !visible) atBottom = true;
			visible = shown;

			if (atBottom) scrollToBottom();
		});

		observer.observe(element);

		$effect.pre(() => {
			void history.messages.length;

			if (atBottom) void tick().then(scrollToBottom);
		});

		const off = on(element, "scroll", () => {
			atBottom = element.offsetHeight + element.scrollTop > element.scrollHeight - 20;

			void loadOlder();
		});

		return () => {
			off();
			observer.disconnect();
		};
	};
}
