import { mount, unmount, type Component } from "svelte";

import { log } from "./log";

interface PopoutOptions {
	title: string;
	width: number;
	height: number;
}

const popouts = new Set<Window>();

// Popouts are rendered by the main window, so they would be left frozen if it
// reloaded.
addEventListener("pagehide", () => {
	for (const popout of popouts) popout.close();
});

// Popups share state with the main window but anything `component` does with
// the global `window` or `document` still refers to the main window.
export function openPopout<Props extends Record<string, any>>(
	component: Component<Props>,
	props: Props,
	options: PopoutOptions,
) {
	const popout = window.open(
		"",
		"_blank",
		`popup,width=${options.width},height=${options.height}`,
	);

	if (!popout) {
		log.error("Failed to open popout");
		return null;
	}

	const target = popout.document;
	target.title = options.title;

	const stopMirroring = mirrorStyles(target);
	const instance = mount(component, { target: target.body, props });

	popouts.add(popout);

	popout.addEventListener(
		"pagehide",
		() => {
			popouts.delete(popout);
			stopMirroring();
			void unmount(instance);
		},
		{ once: true },
	);

	return popout;
}

function mirrorStyles(target: Document) {
	let clones: Element[] = [];

	function sync() {
		for (const clone of clones) {
			clone.remove();
		}

		clones = document.head
			.querySelectorAll("style, link[rel='stylesheet']")
			.values()
			.map((node) => target.importNode(node, true))
			.toArray();

		target.head.append(...clones);

		for (const { name, value } of document.documentElement.attributes) {
			target.documentElement.setAttribute(name, value);
		}
	}

	sync();

	const observer = new MutationObserver(sync);

	observer.observe(document.head, {
		attributes: true,
		characterData: true,
		childList: true,
		subtree: true,
	});

	observer.observe(document.documentElement, { attributes: true });

	return () => observer.disconnect();
}
