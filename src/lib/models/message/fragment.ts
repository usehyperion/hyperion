import type { MessageContent } from "#lib/graphql/twitch.js";
import type { Emote } from "#lib/twitch/irc.js";

export type MessageFragment = TextFragment | EmoteFragment | CheermoteFragment;

interface TextFragment {
	type: "text";
	text: string;
}

interface EmoteFragment {
	type: "emote";
	text: string;
	id: string;
}

interface CheermoteFragment {
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

export function fromGqlContent(content: MessageContent): MessageFragment[] {
	return content.fragments.map((fragment) => {
		const text = fragment.text ?? "";
		const inner = fragment.content;

		switch (inner?.__typename) {
			case "Emote":
				return { type: "emote", text, id: inner.emoteID ?? "" };
			case "CheermoteToken":
				return { type: "cheermote", text, bits: inner.bitsAmount };
			default:
				return { type: "text", text };
		}
	});
}

interface PubSubFragment {
	text: string;
	emoticon?: { emoticonID: string };
}

export function fromPubSubFragments(fragments: PubSubFragment[]): MessageFragment[] {
	return fragments.map((fragment) =>
		fragment.emoticon
			? { type: "emote", text: fragment.text, id: fragment.emoticon.emoticonID }
			: { type: "text", text: fragment.text },
	);
}
