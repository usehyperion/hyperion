/**
 * Error messages shown by more than one command.
 */
export const ErrorMessage = {
	CANNOT_TARGET_SELF: "This command cannot target the channel it's being sent in.",
	CHANNEL_MUST_BE_LIVE: "This command can only be sent when the channel is live.",
	USER_ALREADY_BANNED: (user: string) => `${user} is already banned.`,
	USER_NOT_FOUND: (user: string) => `User ${user} not found.`,
} as const;
