import { invoke } from "@tauri-apps/api/core";
import { fetch } from "@tauri-apps/plugin-http";
import { tick } from "svelte";
import { goto } from "$app/navigation";
import { app } from "$lib/app.svelte";
import { log } from "$lib/log";
import { CurrentUser } from "$lib/models/current-user.svelte";
import { storage } from "$lib/stores";

export const SCOPES = [
	// Channel
	"channel:edit:commercial",
	"channel:manage:broadcast",
	"channel:manage:moderators",
	"channel:manage:polls",
	"channel:manage:predictions",
	"channel:manage:raids",
	"channel:manage:redemptions",
	"channel:manage:vips",
	"channel:moderate",
	"channel:read:editors",
	"channel:read:hype_train",
	"channel:read:polls",
	"channel:read:predictions",
	"channel:read:redemptions",

	// Chat
	"chat:edit",
	"chat:read",

	// Moderation
	"moderator:manage:announcements",
	"moderator:manage:automod",
	"moderator:manage:banned_users",
	"moderator:manage:blocked_terms",
	"moderator:manage:chat_messages",
	"moderator:manage:chat_settings",
	"moderator:manage:shield_mode",
	"moderator:manage:shoutouts",
	"moderator:manage:unban_requests",
	"moderator:manage:warnings",
	"moderator:read:chatters",
	"moderator:read:moderators",
	"moderator:read:suspicious_users",
	"moderator:read:vips",

	// User
	"user:manage:blocked_users",
	"user:manage:chat_color",
	"user:manage:whispers",
	"user:read:blocked_users",
	"user:read:chat",
	"user:read:emotes",
	"user:read:follows",
	"user:read:moderated_channels",
	"user:write:chat",

	// Other
	"clips:edit",
	"whispers:read",
];

async function getTokens(id: string) {
	const response = await fetch(`http://localhost:5173/api/auth/twitch/tokens?user_id=${id}`);
	if (!response.ok) return;

	return response.json();
}

export async function handleDeepLink(url: URL) {
	if (url.host !== "auth") return;

	const userId = url.searchParams.get("user_id");

	if (!userId) {
		throw new Error("Missing user id");
	}

	const tokens = await getTokens(userId);
	if (!tokens) {
		log.warn(`No tokens found for ${userId}`);
		return;
	}

	await invoke("store_tokens", {
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
	});

	const user = await app.twitch.users.fetch(userId);
	storage.state.user = user.data;

	app.user = new CurrentUser(user);

	await storage.saveNow();
	await goto("/");
}

export async function logOut() {
	if (!app.twitch.token) {
		await goto("/auth/login");
		return;
	}

	storage.state.user = null;
	storage.state.lastJoined = null;

	app.user = null;
	app.focused = null;

	await tick();
	await storage.saveNow();

	await fetch("http://localhost:5173/api/auth/twitch/revoke", {
		method: "POST",
		headers: {
			Authorization: app.twitch.token,
		},
	});

	log.info("User logged out");
	await goto("/auth/login");
}
