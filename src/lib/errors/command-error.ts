export class CommandError extends Error {
	public override readonly name = "CommandError";

	public static readonly CANNOT_TARGET_SELF =
		"This command cannot target the channel it's being sent in.";

	public static readonly CHANNEL_MUST_BE_LIVE =
		"This command can only be sent when the channel is live.";

	public static USER_ALREADY_BANNED(user: string) {
		return `${user} is already banned.`;
	}

	public static USER_NOT_FOUND(user: string) {
		return `User ${user} not found.`;
	}
}
