export interface TextFragment {
	type: "text";
	text: string;
}

export interface CheermoteFragment {
	type: "cheermote";
	text: string;
	cheermote: {
		prefix: string;
		bits: number;
		tier: number;
	};
}

export interface EmoteFragment {
	type: "emote";
	text: string;
	emote: {
		id: string;
		emote_set_id: string;
		owner_id?: string;
		formats?: string[];
	};
}

export interface MentionFragment {
	type: "mention";
	text: string;
	user_id: string;
	user_login: string;
	user_name: string;
}

export type Fragment = TextFragment | CheermoteFragment | EmoteFragment | MentionFragment;

export interface StructuredMessage {
	message_id: string;
	text: string;
	fragments: Fragment[];
}
