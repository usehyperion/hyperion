import chroma from "chroma-js";

const MIN_CONTRAST = 4.5;
const MAX_ADJUSTMENTS = 50;

const colorCache = new Map<string, string>();

// Bumped whenever the page restyles, so names already on screen recompute
// against the new ground instead of keeping the previous theme's contrast.
let generation = $state(0);

// Held between restyles because reading it forces a style recalculation, and
// makeReadable runs for every username the chat list mounts. Reading it per
// call interleaves a forced recalc with each row the virtualizer writes.
let cached: { generation: number; value: string } | null = null;

let observing = false;

function observe() {
	if (observing) return;
	observing = true;

	function invalidate() {
		generation++;
	}

	// mode-watcher swaps the mode class inside a frame callback, so the
	// attribute landing on <html> is what tells us the new palette is in effect.
	const observer = new MutationObserver(invalidate);

	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "style", "data-theme"],
	});

	const theme = document.getElementById("hyperion-custom-theme");
	if (!theme) return;

	// Applying a custom theme only repaints once its stylesheet loads, while
	// clearing one drops the sheet synchronously and shows up as the id
	// attribute being emptied.
	observer.observe(theme, { attributes: true, attributeFilter: ["data-theme-id"] });
	theme.addEventListener("load", invalidate);
}

function getBackgroundColor() {
	observe();

	// Reading `generation` is what makes callers reactive to a theme change.
	const current = generation;

	if (cached?.generation !== current) {
		cached = { generation: current, value: getComputedStyle(document.body).backgroundColor };
	}

	return cached.value;
}

/**
 * Adjusts a foreground color until it meets WCAG AA contrast against the
 * current background, returning it unchanged if it already does.
 */
export function makeReadable(foreground: string) {
	if (foreground === "inherit") return foreground;

	const background = getBackgroundColor();
	const key = `${foreground}:${background}`;

	const seen = colorCache.get(key);
	if (seen) return seen;

	const [l, c, h] = (background.match(/[\d.]+/g) ?? []).map(Number);

	let fg = chroma(foreground);
	const bg = chroma.oklch(l, c, h);
	let contrast = chroma.contrast(fg, bg);

	if (contrast >= MIN_CONTRAST) {
		colorCache.set(key, fg.hex());
		return fg.hex();
	}

	const lighten = bg.luminance() < 0.5;
	let i = 0;

	while (contrast < MIN_CONTRAST && i < MAX_ADJUSTMENTS) {
		fg = lighten ? fg.brighten(0.1) : fg.darken(0.1);
		contrast = chroma.contrast(fg, bg);
		i++;
	}

	const adjusted = fg.hex();
	colorCache.set(key, adjusted);

	return adjusted;
}
