import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { FileSystemIconLoader } from "unplugin-icons/loaders";
import icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
	build: {
		target: "esnext",
	},
	clearScreen: false,
	plugins: [
		devtoolsJson(),
		tailwindcss(),
		sveltekit(),
		icons({
			compiler: "svelte",
			customCollections: {
				local: FileSystemIconLoader("./src/assets/icons"),
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
}));
