import { invoke } from "@tauri-apps/api/core";
import { tick } from "svelte";

import { goto } from "$app/navigation";
import { app } from "$lib/app.svelte";
import { log } from "$lib/log";
import { CurrentUser } from "$lib/models/current-user.svelte";
import { storage } from "$lib/stores";

interface AuthUser {
	id: string;
	login: string;
}

export interface Integrity {
	token: string;
	deviceId: string;
	expiration: number;
}

export interface TwitchAuth {
	accessToken: string;
	integrity: Integrity | null;
}

export function getIntegrity() {
	return invoke<Integrity | null>("get_integrity");
}

export async function completeLogin(auth: TwitchAuth) {
	const account = await invoke<AuthUser>("store_token", { auth });

	app.twitch.token = auth.accessToken;

	const user = await app.twitch.users.fetch(account.id);
	storage.state.user = user.data;

	app.user = new CurrentUser(user);

	log.info(`Logged in as ${account.login}`);

	await tick();
	await storage.saveNow();
	await goto("/");
}

export async function logOut() {
	storage.state.user = null;

	app.user = null;
	app.focused = null;
	app.twitch.token = null;

	await tick();
	await storage.saveNow();

	// Drop the keyring entry too, otherwise the next start up restores the token
	// and logs straight back in.
	await invoke("clear_token");

	log.info("User logged out");
	await goto("/auth/login");
}
