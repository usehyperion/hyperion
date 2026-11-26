import { getAllWebviewWindows, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { mount, unmount, type Component } from "svelte";

import Popout from "./components/Popout.svelte";
import { log } from "./log";

const LABEL_PREFIX = "popout-";

interface PopoutOptions {
	title: string;
	width: number;
	height: number;
	key?: string;
}

interface OpenPopout {
	window: Window;
	label: Promise<string | null>;
}

const windows = new Set<Window>();
const popouts = new Map<string, OpenPopout>();

// Popouts are rendered by the main window, so they would be left frozen if it
// reloaded.
addEventListener("pagehide", () => {
	windows.forEach((w) => w.close());
});

// Popups share state with the main window, but anything `component` does with
// the global `window` or `document` still refers to the main window.
export function openPopout<P extends Record<string, any>>(
	component: Component<P>,
	props: P,
	options: PopoutOptions,
) {
	const existing = options.key && popouts.get(options.key);

	if (existing) {
		void focus(existing);
		return existing.window;
	}

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

	const instance = mount(Popout<P>, {
		target: target.body,
		props: { component, props },
	});

	windows.add(popout);

	if (options.key) {
		popouts.set(options.key, {
			window: popout,
			label: newestLabel(),
		});
	}

	popout.addEventListener(
		"pagehide",
		() => {
			windows.delete(popout);

			if (options.key) {
				popouts.delete(options.key);
			}

			stopMirroring();
			void unmount(instance);
		},
		{ once: true },
	);

	return popout;
}

async function focus(popout: OpenPopout) {
	try {
		const label = await popout.label;
		const window = label && (await WebviewWindow.getByLabel(label));
		if (!window) return;

		await window.unminimize();
		await window.setFocus();
	} catch (error) {
		log.error("Failed to focus popout", error);
	}
}

async function newestLabel() {
	const ids = (await getAllWebviewWindows())
		.map((window) => window.label)
		.filter((label) => label.startsWith(LABEL_PREFIX))
		.map((label) => Number(label.slice(LABEL_PREFIX.length)));

	return ids.length ? LABEL_PREFIX + Math.max(...ids) : null;
}

function mirrorStyles(target: Document) {
	let clones: Element[] = [];

	function sync() {
		clones.forEach((node) => node.remove());

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
