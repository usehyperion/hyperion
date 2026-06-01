import { parse as parseTld } from "tldts";
import { app } from "$lib/app.svelte";
import type { Emote } from "$lib/emotes";
import type { CheermoteTier } from "$lib/graphql/twitch";
import type { Range } from "$lib/twitch/irc";
import type { User } from "../user.svelte";
import type { UserMessage } from "./user-message";

export interface BaseNode {
	start: number;
	end: number;
	value: string;
	marked: boolean;
}

export interface TextNode extends BaseNode {
	type: "text";
	data: string;
}

export interface LinkNode extends BaseNode {
	type: "link";
	data: {
		url: URL;
		tld: ReturnType<typeof parseTld>;
	};
}

export interface MentionNode extends BaseNode {
	type: "mention";
	data: {
		user: User | undefined;
	};
}

export interface CheerNode extends BaseNode {
	type: "cheer";
	data: {
		prefix: string;
		bits: number;
		tier: CheermoteTier;
	};
}

export interface EmoteNode extends BaseNode {
	type: "emote";
	data: {
		layers: Emote[];
		emote: Emote;
	};
}

export type Node = TextNode | LinkNode | MentionNode | CheerNode | EmoteNode;

export function parse(message: UserMessage): Node[] {
	const ircEmotes = [...message.data.emotes];
	const boundaries = translateBoundaries(message);

	const nodes: Node[] = [];

	for (const match of message.text.matchAll(/\S+|\s+/g)) {
		const base: BaseNode = {
			start: match.index,
			end: match.index + match[0].length,
			value: match[0],
			marked: isMarked(match.index, match.index + match[0].length, boundaries),
		};

		const node = classify(base, message, ircEmotes, boundaries);
		if (node) nodes.push(node);
	}

	return fold(nodes);
}

function classify(
	base: BaseNode,
	message: UserMessage,
	ircEmotes: UserMessage["data"]["emotes"],
	boundaries: Range[],
): Node | null {
	const part = base.value;

	const url = URL.parse(`https://${part.replace(/^https?:\/\/|\.$/i, "")}`);
	const tld = url ? parseTld(url.hostname) : null;

	if (url && tld?.domain && tld.isIcann) {
		return {
			...base,
			type: "link",
			data: { url, tld },
		};
	}

	if (/^@\w{4,24}$/.test(part)) {
		const name = part.slice(1).toLowerCase();
		const viewer = message.channel.viewers.values().find((u) => u.username === name);

		return {
			...base,
			type: "mention",
			data: { user: viewer?.user },
		};
	}

	const cheermote = message.channel.cheermotes.find(
		(c) => part.toLowerCase().startsWith(c.prefix.toLowerCase()) && /\d+$/.test(part),
	);

	if (cheermote) {
		const amount = Number(part.slice(cheermote.prefix.length));
		if (amount <= 0) return null;

		let tier: CheermoteTier | undefined;

		for (const candidate of cheermote.tiers.toSorted((a, b) => b.bits - a.bits)) {
			if (amount >= candidate.bits) {
				tier = candidate;
				break;
			}
		}

		if (!tier) return null;

		return {
			...base,
			type: "cheer",
			data: {
				prefix: cheermote.prefix,
				bits: amount,
				tier,
			},
		};
	}

	const ircEmote = ircEmotes.find((e) => e.code === part);

	if (ircEmote) {
		ircEmotes.splice(ircEmotes.indexOf(ircEmote), 1);

		const baseUrl = "https://static-cdn.jtvnw.net/emoticons/v2";

		return {
			start: ircEmote.range.start,
			end: ircEmote.range.end,
			value: ircEmote.code,
			marked: base.marked || isMarked(ircEmote.range.start, ircEmote.range.end, boundaries),
			type: "emote",
			data: {
				emote: {
					provider: "Twitch",
					id: ircEmote.id,
					name: ircEmote.code,
					width: 56,
					height: 56,
					srcset: [1, 2, 3].map(
						(density) =>
							`${baseUrl}/${ircEmote.id}/default/dark/${density}.0 ${density}x`,
					),
				},
				layers: [],
			},
		};
	}

	const emote =
		message.author.emotes.get(part) ?? app.emotes.get(part) ?? message.channel.emotes.get(part);

	if (emote) {
		return {
			...base,
			type: "emote",
			data: {
				emote,
				layers: [],
			},
		};
	}

	return { ...base, type: "text", data: part };
}

function fold(nodes: Node[]): Node[] {
	const merged: Node[] = [];

	for (const node of nodes) {
		if (node.type === "emote" && node.data.emote.zeroWidth) {
			precedingEmote(merged)?.data.layers.push(node.data.emote);
			continue;
		}

		const prev = merged.at(-1);

		if (node.type === "text" && prev?.type === "text" && node.marked === prev.marked) {
			prev.end = node.end;
			prev.value += node.value;
			prev.data += node.data;
		} else {
			merged.push(node);
		}
	}

	return merged;
}

function precedingEmote(nodes: Node[]): EmoteNode | null {
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i];
		if (node.type === "text" && !node.data.trim()) continue;

		return node.type === "emote" ? node : null;
	}

	return null;
}

function isMarked(start: number, end: number, boundaries: Range[]): boolean {
	return boundaries.some((b) => end > b.start && start <= b.end);
}

function translateBoundaries(message: UserMessage): Range[] {
	if (!message.autoMod?.boundaries) return [];

	const map = [0];
	let index = 0;

	const segmenter = new Intl.Segmenter(navigator.language, { granularity: "grapheme" });

	for (const data of segmenter.segment(message.text)) {
		index += data.segment.length;
		map.push(index);
	}

	return message.autoMod.boundaries.map((b) => ({
		start: map[b.start_pos],
		end: map[b.end_pos],
	}));
}
