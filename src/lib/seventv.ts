import { app } from "./app.svelte";
import { log } from "./log";

interface EventObject {
	id: string;
	name: string;
}

interface HostFile {
	format: string;
	frame_count: number;
	width: number;
	height: number;
	name: string;
	static_name: string;
}

interface Host {
	url: string;
	files: HostFile[];
}

interface Emote {
	name: string;
	listed: boolean;
	flags: number;
	host: Host;
	owner: User;
}

export interface EmoteChange extends EventObject {
	data: Emote;
}

export interface Paint {
	name: string;
	css: string;
}

interface Connection {
	id: string;
	platform: "TWITCH" | "KICK" | "YOUTUBE" | "DISCORD";
	username: string;
	display_name: string;
}

interface UserStyle {
	color: number;
	badge_id: string;
	paint_id: string;
}

interface User {
	id: string;
	avatar_url: string;
	username: string;
	display_name: string;
	role_ids: string[];
	connections: Connection[];
	style: UserStyle;
}

interface BadgeData extends EventObject {
	host: Host;
	tooltip: string;
}

interface BadgeCosmetic {
	id: string;
	kind: "BADGE";
	data: BadgeData;
}

interface PaintShadow {
	color: number;
	radius: number;
	x_offset: number;
	y_offset: number;
}

interface PaintStop {
	color: number;
	at: number;
}

interface PaintData extends EventObject {
	angle: number;
	color: number | null;
	function: "LINEAR_GRADIENT" | "RADIAL_GRADIENT" | "URL";
	image_url: string;
	shape: "circle" | "ellipse";
	repeat: boolean;
	shadows: PaintShadow[];
	stops: PaintStop[];
}

interface PaintCosmetic {
	id: string;
	kind: "PAINT";
	data: PaintData;
}

type CosmeticCreate = BadgeCosmetic | PaintCosmetic;

interface EmoteSetCreate extends EventObject {
	capacity: number;
	flags: number;
	immutable: boolean;
	privileged: boolean;
	tags: string;
	owner: User;
}

interface EntitlementCreate {
	id: string;
	kind: "BADGE" | "PAINT" | "EMOTE_SET";
	ref_id: string;
	user: User;
}

interface ChangeField<K, T, N> {
	key: string;
	old_value: K extends "pulled" | "updated" ? T : null;
	value: N extends true ? ChangeField<K, T, false>[] : T;
}

interface ChangeMap<T, N = false> {
	id: string;
	kind: number;
	actor: User;
	pushed?: ChangeField<"pushed", T, N>[];
	pulled?: ChangeField<"pulled", T, N>[];
	updated?: ChangeField<"updated", T, N>[];
}

export interface DispatchPayload {
	type: string;
	body: { object: unknown } | ChangeMap<unknown>;
}

export interface SevenTvEventMap {
	"cosmetic.create": CosmeticCreate;
	"emote_set.create": EmoteSetCreate;
	"emote_set.update": ChangeMap<EmoteChange>;
	"entitlement.create": EntitlementCreate;
	"user.update": ChangeMap<EventObject | null, true>;
}

export async function sendPresence(id: string) {
	if (!app.user?.seventvId) return;

	const response = await fetch(`https://7tv.io/v3/users/${app.user.seventvId}/presences`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			kind: 1,
			passive: false,
			session_id: null,
			data: {
				platform: "TWITCH",
				id,
			},
		}),
	});

	if (response.ok) {
		log.info(`Presence sent in ${id}`);
	} else {
		const body = await response.text();
		log.error(`Failed to send presence: ${body}`);
	}
}
