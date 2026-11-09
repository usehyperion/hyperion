import { SvelteMap } from "svelte/reactivity";

import type { Emote as ChatEmote } from "./emotes";

interface EventObject {
	id: string;
	name: string;
}

export interface HostFile {
	format: string;
	frame_count: number;
	width: number;
	height: number;
	name: string;
	static_name: string;
}

export interface Host {
	url: string;
	files: HostFile[];
}

interface Emote {
	name: string;
	listed: boolean;
	flags: number;
	host: Host;
	owner: SevenTvUser;
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

export interface SevenTvUser {
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
	owner: SevenTvUser;
}

interface EntitlementCreate {
	id: string;
	kind: "BADGE" | "PAINT" | "EMOTE_SET";
	ref_id: string;
	user: SevenTvUser;
}

interface ChangeField<K, T, N> {
	key: string;
	old_value: K extends "pulled" | "updated" ? T : null;
	value: N extends true ? ChangeField<K, T, false>[] : T;
}

interface ChangeMap<T, N = false> {
	id: string;
	kind: number;
	actor: SevenTvUser;
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

export function twitchConnection(user: SevenTvUser) {
	return user.connections.find((c) => c.platform === "TWITCH");
}

export function sevenTvFileUrl(host: Host, file: HostFile) {
	return `https:${host.url}/${file.name}`;
}

export class SevenTvCosmetics {
	/**
	 * Paints keyed by their id.
	 */
	public readonly paints = new Map<string, Paint>();

	/**
	 * The emotes of personal emote sets keyed by set id.
	 */
	public readonly personalSets = new SvelteMap<string, ChatEmote[]>();

	/**
	 * The paint each user has equipped keyed by user id.
	 */
	public readonly userPaints = new SvelteMap<string, Paint | undefined>();

	/**
	 * The personal emote set each user has keyed by user id.
	 */
	public readonly userPersonalSets = new SvelteMap<string, string>();

	/**
	 * The emote with the given name in the user's personal emote set.
	 */
	public personalEmote(userId: string, name: string) {
		const setId = this.userPersonalSets.get(userId);

		return setId
			? this.personalSets.get(setId)?.find((emote) => emote.displayName === name)
			: undefined;
	}

	public clear() {
		this.paints.clear();
		this.userPaints.clear();
		this.personalSets.clear();
		this.userPersonalSets.clear();
	}
}
