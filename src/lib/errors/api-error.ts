interface HttpErrorLike {
	status?: number;
	statusCode?: number;
	statusText?: string;
	data?: unknown;
	response?: { status: number };
}

function isAbort(error: unknown): boolean {
	return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export class ApiError extends Error {
	public constructor(
		public readonly status: number,
		message: string,

		/**
		 * The raw, parsed response body if one was present. Useful for reading
		 * endpoint-specific error fields beyond the human-readable message.
		 */
		public readonly body?: unknown,
	) {
		super(message);

		this.name = "ApiError";
	}

	/**
	 * Normalizes an unknown thrown value into an `ApiError` so callers only ever
	 * deal with a single error type. HTTP failures keep their real status; an
	 * abort/timeout becomes `408`, and a network failure with no response
	 * becomes `0`.
	 */
	public static from(error: unknown): ApiError {
		if (error instanceof ApiError) return error;

		// ofetch wraps an aborted/timed-out request in a FetchError and hangs the
		// original error off its `cause`, so check both
		if (error instanceof Error && (isAbort(error) || isAbort(error.cause))) {
			return new ApiError(408, "Request timed out");
		}

		if (
			error instanceof Error &&
			("status" in error || "statusCode" in error || "response" in error)
		) {
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion - duck typing
			const http = error as Error & HttpErrorLike;
			const status = http.status ?? http.statusCode ?? http.response?.status ?? 0;

			if (status) {
				const message =
					ApiError.#messageFrom(http.data) ?? http.statusText ?? error.message;

				return new ApiError(status, message, http.data);
			}
		}

		return new ApiError(0, error instanceof Error ? error.message : "Network request failed");
	}

	static #messageFrom(body: unknown): string | undefined {
		if (body && typeof body === "object" && "message" in body) {
			const { message } = body;

			if (typeof message === "string" && message) {
				return message;
			}
		}

		return undefined;
	}
}
