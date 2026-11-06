import type { Badge as ApiBadge } from "#lib/graphql/twitch.js";

export interface BttvBadge {
	type: number;
	description: string;
	svg: string;
}

export interface FfzBadge {
	id: number;
	name: string;
	title: string;
	color: string;
	urls: Record<string, string>;
}

interface BadgeData {
	setId: string;
	version: string;
	title: string;
	description: string;
	color?: string;
	imageUrl: string;
}

/**
 * The badge set ids of third-party providers.
 */
export const BADGE_SETS = { seventv: "7tv", bttv: "bttv", ffz: "ffz" } as const;

export class Badge {
	/**
	 * The id of the badge. This is in the form of `{setId}:{version}`.
	 */
	public readonly id: string;

	public readonly setId: string;

	public readonly version: string;

	/**
	 * The title of the badge. This is the text displayed when hovering over
	 * the badge.
	 */
	public readonly title: string;

	/**
	 * The description of the badge. This is the alt text for the badge image.
	 * In most cases, this is the same as the title.
	 */
	public readonly description: string;

	/**
	 * The background color of the badge if any.
	 */
	public readonly color?: string;

	public readonly imageUrl: string;

	public constructor(data: BadgeData) {
		this.id = Badge.key(data.setId, data.version);
		this.setId = data.setId;
		this.version = data.version;
		this.title = data.title;
		this.description = data.description;
		this.color = data.color;
		this.imageUrl = data.imageUrl;
	}

	/**
	 * The id of the badge with the given set and version.
	 */
	public static key(setId: string, version: string) {
		return `${setId}:${version}`;
	}

	public static fromGql(this: void, data: ApiBadge) {
		return new Badge({
			setId: data.setID,
			version: data.version,
			title: data.title,
			description: data.description,
			imageUrl: data.imageURL,
		});
	}
}
