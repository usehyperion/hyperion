import type { Emote } from "$lib/twitch/irc";

export type MessageFragment = TextFragment | EmoteFragment | CheermoteFragment;

export interface TextFragment {
	type: "text";
	text: string;
}

export interface EmoteFragment {
	type: "emote";
	text: string;
	id: string;
}

export interface CheermoteFragment {
	type: "cheermote";
	text: string;
	bits: number;
}

export function extractEmotes(fragments: MessageFragment[]): Emote[] {
	const emotes: Emote[] = [];
	let offset = 0;

	for (const fragment of fragments) {
		const length = Array.from(fragment.text).length;

		if (fragment.type === "emote") {
			emotes.push({
				id: fragment.id,
				code: fragment.text,
				range: {
					start: offset,
					end: offset + length,
				},
			});
		}

		offset += length;
	}

	return emotes;
}
