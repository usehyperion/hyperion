import type { Badge as ApiBadge } from "$lib/graphql/twitch";

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

export class Badge {
	/**
	 * The id of the badge. This is in the form of `{setId}:{version}`.
	 */
	public readonly id: string;

	/**
	 * The id of the set the badge belongs to.
	 */
	public readonly setId: string;

	/**
	 * The version of the badge within its set.
	 */
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

	/**
	 * The url of the badge image.
	 */
	public readonly imageUrl: string;

	public constructor(data: BadgeData) {
		this.id = `${data.setId}:${data.version}`;
		this.setId = data.setId;
		this.version = data.version;
		this.title = data.title;
		this.description = data.description;
		this.color = data.color;
		this.imageUrl = data.imageUrl;
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
