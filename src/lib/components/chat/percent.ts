/**
 * The rounded share of `part` in `total` as a percentage, or 0 when there is
 * no total yet.
 */
export function percent(part: number, total: number) {
	return total > 0 ? Math.round((part / total) * 100) : 0;
}
