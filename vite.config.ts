import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { FileSystemIconLoader } from "unplugin-icons/loaders";
import icons from "unplugin-icons/vite";
import devtoolsJson from "vite-plugin-devtools-json";
import { defineConfig } from "vite-plus";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	build: {
		target: "esnext",
	},
	clearScreen: false,
	plugins: [
		devtoolsJson(),
		tailwindcss(),
		sveltekit({
			adapter: adapter({ fallback: "index.html" }),
		}),
		icons({
			compiler: "svelte",
			customCollections: {
				local: FileSystemIconLoader("./src/assets/icons"),
				logos: FileSystemIconLoader("./src/assets/logos"),
			},
			iconCustomizer(collection, _icon, props) {
				if (collection === "ph") {
					props.width = "1em";
					props.height = "1em";
				}
			},
		}),
	],
	server: {
		hmr: host
			? {
					host,
					port: 1421,
					protocol: "ws",
				}
			: undefined,
		host: host || false,
		port: 1420,
		strictPort: true,
		warmup: {
			clientFiles: ["./src/lib/components/ui/**/*.{ts,svelte}", "./src/lib/models/**/*.ts"],
		},
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	staged: {
		"*.{ts,svelte,json}": "vp check --fix",
	},
	fmt: {
		tabWidth: 4,
		useTabs: true,
		svelte: true,
		sortTailwindcss: {
			stylesheet: "./src/styles/app.css",
		},
		sortImports: {
			internalPattern: ["~", "$"],
			newlinesBetween: false,
		},
		ignorePatterns: [".claude/**", "skills-lock.json", "src/assets/**"],
		overrides: [
			{
				files: ["*.yml", "*.yaml"],
				options: {
					tabWidth: 2,
					useTabs: false,
				},
			},
		],
	},
	lint: {
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
			"no-shadow": "off",
			"no-underscore-dangle": ["error", { allow: ["__typename"] }],
			"typescript/adjacent-overload-signatures": "error",
			"typescript/no-floating-promises": "allow",
			"unicorn/filename-case": [
				"error",
				{
					cases: {
						kebabCase: true,
						pascalCase: true,
					},
				},
			],
			"unicorn/no-null": "allow",
			"unicorn/number-literal-case": "error",
		},
	},
});
