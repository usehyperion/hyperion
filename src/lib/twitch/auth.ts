import { invoke } from "@tauri-apps/api/core";
import { fetch } from "@tauri-apps/plugin-http";
import { tick } from "svelte";

import { goto } from "$app/navigation";
import { app } from "$lib/app.svelte";
import { log } from "$lib/log";
import { CurrentUser } from "$lib/models/current-user.svelte";
import { storage } from "$lib/stores";
import { Session, type Credentials } from "$lib/twitch/session";

interface AuthUser {
	id: string;
	login: string;
}

export async function completeLogin(credentials: Credentials) {
	const account = await invoke<AuthUser>("store_token", { auth: credentials });

	app.twitch.session = new Session(credentials);

	const user = await app.twitch.users.fetch(account.id);
	storage.state.user = user.data;

	app.user = new CurrentUser(user);

	log.info(`Logged in as ${account.login}`);

	await tick();
	await storage.saveNow();
	await goto("/");
}

export async function logOut() {
	const accessToken = app.twitch.session?.accessToken;

	storage.state.user = null;

	app.user = null;
	app.focused = null;
	app.twitch.session = null;

	await tick();
	await storage.saveNow();

	// Drop the keyring entry too, otherwise the next start up restores the
	// session and logs straight back in.
	await invoke("clear_session");

	if (accessToken) {
		await fetch("https://usehyperion.app/api/auth/twitch/revoke", {
			method: "POST",
			headers: {
				Authorization: accessToken,
			},
		});
	}

	log.info("User logged out");
	await goto("/auth/login");
}
