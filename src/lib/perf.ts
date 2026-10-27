import { log } from "./log";

/**
 * Temporary instrumentation for measuring user card popout load times.
 */
export function mark(name: string) {
	performance.mark(name);
}

/**
 * Logs every mark recorded in this window as the time since the card was
 * requested. A spare popout navigates long before it is claimed, so its marks
 * are rebased from navigation start onto the request.
 *
 * @param openedAt The epoch time the main window requested the card, if known.
 */
export function reportMarks(title: string, openedAt: number | null) {
	const lines = [`[perf] ${title}`];
	const offset = openedAt ? performance.timeOrigin - openedAt : 0;

	let previous = 0;

	for (const entry of performance.getEntriesByType("mark")) {
		const time = entry.startTime + offset;
		const delta = time - previous;
		previous = time;

		lines.push(`  ${entry.name}: ${time.toFixed(1)}ms (+${delta.toFixed(1)}ms)`);
	}

	const message = lines.join("\n");

	console.log(message);
	void log.info(message).catch(() => {});
}
