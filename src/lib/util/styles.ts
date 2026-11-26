import {
	type ClassValue,
	type CnOptions,
	createTV,
	cx,
	extendTailwindMerge,
	type TWMergeConfig,
	type VariantProps,
} from "tailwind-variants/config";

// Without these, the merger reads `text-body` as a color and can't see `size-control-sm` as a size.
const twMergeConfig = {
	extend: {
		theme: {
			spacing: ["control", "control-sm", "control-lg", "title-bar"],
			text: ["caption", "detail", "body", "title", "display"],
			radius: ["control", "panel"],
			shadow: ["raised", "popup"],
		},
	},
} satisfies TWMergeConfig;

const merge = extendTailwindMerge(twMergeConfig);

export const tv = createTV({ twMergeConfig });

export function cn(...classes: CnOptions): string {
	return merge(cx(...classes) ?? "");
}

export type { ClassValue, VariantProps };
