import { error } from "@sveltejs/kit";
import { app } from "$lib/app.svelte";
import Chats from "~icons/ph/chats";

export function load() {
	if (!app.user) error(401);

	return {
		whispers: app.user.whispers,
		titleBar: {
			icon: Chats,
			title: "Whispers",
		},
	};
}
