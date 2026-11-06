import chroma from "chroma-js";
import { createSubscriber } from "svelte/reactivity";

const colorCache = new Map<string, string>();

const subscribeBackground = createSubscriber((update) => {
	const observer = new MutationObserver(update);

	observer.observe(document.documentElement, {
		attributeFilter: ["class", "style"],
	});

	return () => observer.disconnect();
});

export function makeReadable(foreground: string) {
	if (foreground === "inherit") return foreground;

	subscribeBackground();

	const background = getComputedStyle(document.body).backgroundColor;
	const key = `${foreground}:${background}`;

	const seen = colorCache.get(key);
	if (seen) return seen;

	const [l, c, h] = (background.match(/[\d.]+/g) ?? []).map(Number);

	let fg = chroma(foreground);
	const bg = chroma.oklch(l, c, h);
	let contrast = chroma.contrast(fg, bg);

	if (contrast >= 4.5) {
		colorCache.set(key, fg.hex());
		return fg.hex();
	}

	const lighten = bg.luminance() < 0.5;
	let i = 0;

	while (contrast < 4.5 && i < 50) {
		fg = lighten ? fg.brighten(0.1) : fg.darken(0.1);
		contrast = chroma.contrast(fg, bg);
		i++;
	}

	const adjusted = fg.hex();
	colorCache.set(key, adjusted);

	return adjusted;
}
