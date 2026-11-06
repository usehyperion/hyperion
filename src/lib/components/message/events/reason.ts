/**
 * Ends an event sentence with the given reason, or with a period if there is
 * none.
 */
export function reasonSuffix(reason: string | null | undefined) {
	return reason ? `: ${reason}` : ".";
}
