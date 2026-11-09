export abstract class Notice {
	/**
	 * Whether the notice is hidden for the current user.
	 */
	public hidden = $state(false);

	#timer: ReturnType<typeof setTimeout> | null = null;

	protected abstract remove(): void;

	public dispose() {
		if (this.#timer !== null) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
	}

	/**
	 * Schedules the notice to be removed. Later calls keep the first schedule.
	 */
	protected expireIn(ms: number) {
		this.#timer ??= setTimeout(
			() => {
				this.#timer = null;
				this.remove();
			},
			Math.max(0, ms),
		);
	}

	/**
	 * Schedules the notice to be removed `linger` ms after it ended, so final
	 * results stay visible briefly.
	 */
	protected expireAfter(endedAt: string | null, linger: number) {
		const ended = endedAt ? new Date(endedAt).getTime() : Number.NaN;
		this.expireIn(Number.isNaN(ended) ? linger : Math.min(ended + linger - Date.now(), linger));
	}
}
