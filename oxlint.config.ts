import { defineConfig } from "oxlint";

export default defineConfig({
	categories: {
		correctness: "error",
		nursery: "allow",
		pedantic: "allow",
		perf: "warn",
		restriction: "allow",
		style: "allow",
		suspicious: "warn",
	},
	options: {
		typeAware: true,
	},
	rules: {
		"no-control-regex": "allow",
		"typescript/adjacent-overload-signatures": "error",
		"typescript/no-floating-promises": "allow",
		"unicorn/filename-case": ["error", { ignore: ".*\\.svelte$" }],
		"unicorn/no-null": "allow",
		"unicorn/number-literal-case": "error",
	},
});
