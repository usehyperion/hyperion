export function clamp(min: number, value: number, max: number) {
	return Math.min(Math.max(min, value), max);
}

export function percent(part: number, total: number) {
	return total > 0 ? Math.round((part / total) * 100) : 0;
}
