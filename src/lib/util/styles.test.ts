import { expect, test } from "vite-plus/test";

import { cn, tv } from "./styles.js";

test("custom tokens merge with the utilities they conflict with", () => {
	expect(cn("w-max size-control-sm")).toBe("size-control-sm");
	expect(cn("size-control-sm", "size-8")).toBe("size-8");
	expect(cn("rounded-control", "rounded-none")).toBe("rounded-none");
	expect(cn("text-ui text-fg")).toBe("text-ui text-fg");
	expect(cn("text-2xs", "text-ui")).toBe("text-ui");
	expect(cn("shadow-raised", "shadow-popup")).toBe("shadow-popup");
	expect(cn("h-control", "h-12")).toBe("h-12");
});

test("tv keeps font sizes beside text colors", () => {
	const button = tv({ base: "text-ui", variants: { tone: { muted: "text-fg-muted" } } });
	expect(button({ tone: "muted" })).toBe("text-ui text-fg-muted");
});
