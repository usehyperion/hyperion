import "unplugin-icons/types/svelte";
import type { Component } from "svelte";
import type { SVGAttributes } from "svelte/elements";

declare global {
	namespace App {
		interface PageData {}
	}

	interface RegExpConstructor {
		escape(string: string): string;
	}
}
