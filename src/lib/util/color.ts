import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import oklchPlugin from "colord/plugins/oklch";
import { createSubscriber } from "svelte/reactivity";

extend([a11yPlugin, oklchPlugin]);

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

	let fg = colord(foreground);
	const bg = colord({ l, c, h, ok: true });
	let contrast = fg.contrast(bg);

	if (contrast >= 4.5) {
		colorCache.set(key, fg.toHex());
		return fg.toHex();
	}

	const lighten = bg.luminance() < 0.5;
	let i = 0;

	while (contrast < 4.5 && i < 50) {
		fg = lighten ? fg.lighten(0.1) : fg.darken(0.1);
		contrast = fg.contrast(bg);
		i++;
	}

	const adjusted = fg.toHex();
	colorCache.set(key, adjusted);

	return adjusted;
}
