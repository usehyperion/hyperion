import { log } from "./log";

/**
 * Temporary instrumentation for measuring user card popout load times. Marks
 * are relative to the webview's navigation start.
 */
export function mark(name: string) {
	performance.mark(name);
}

/**
 * Logs every mark recorded in this window, along with how long the webview
 * took to start navigating after the main window requested it.
 *
 * @param openedAt The epoch time the main window created the popout, if known.
 */
export function reportMarks(title: string, openedAt: number | null) {
	const lines = [`[perf] ${title}`];

	if (openedAt) {
		lines.push(`  window spawn: ${(performance.timeOrigin - openedAt).toFixed(1)}ms`);
	}

	const [navigation] = performance.getEntriesByType("navigation");

	if (navigation instanceof PerformanceNavigationTiming) {
		lines.push(`  dom content loaded: ${navigation.domContentLoadedEventEnd.toFixed(1)}ms`);
	}

	let previous = 0;

	for (const entry of performance.getEntriesByType("mark")) {
		const delta = entry.startTime - previous;
		previous = entry.startTime;

		lines.push(`  ${entry.name}: ${entry.startTime.toFixed(1)}ms (+${delta.toFixed(1)}ms)`);
	}

	const message = lines.join("\n");

	console.log(message);
	void log.info(message).catch(() => {});
}
