import "unplugin-icons/types/svelte";
import type { Component } from "svelte";
import type { SVGAttributes } from "svelte/elements";

interface TitleBar {
	icon: Component<SVGAttributes<SVGElement>>;
	title: string;
}

declare global {
	namespace App {
		interface PageData {
			detached: boolean;
			titleBar?: TitleBar;
		}
	}

	interface RegExpConstructor {
		escape(string: string): string;
	}
}
