import { ofetch } from "ofetch";

import { ApiError } from "./errors/api-error";

const TIMEOUT = 15_000;

interface RequestOptions<T> {
	method?: "GET" | "POST";
	headers?: HeadersInit;
	body?: Record<string, unknown>;
	signal?: AbortSignal;

	/**
	 * The value to resolve with when the resource doesn't exist instead of
	 * throwing.
	 */
	notFound?: T;
}

export async function fetchJson<T>(url: string, options: RequestOptions<T> = {}): Promise<T> {
	const timeout = AbortSignal.timeout(TIMEOUT);

	try {
		return await ofetch<T>(url, {
			method: options.method,
			headers: options.headers,
			body: options.body,
			signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
		});
	} catch (error) {
		// A cancelled request isn't a failure, so don't report it as a timeout.
		if (options.signal?.aborted && isAbortError(error)) {
			throw options.signal.reason;
		}

		const apiError = ApiError.from(error);

		if (apiError.status === 404 && options.notFound !== undefined) {
			return options.notFound;
		}

		throw apiError;
	}
}

function isAbortError(error: unknown) {
	return (
		error instanceof Error &&
		(error.name === "AbortError" ||
			(error.cause instanceof Error && error.cause.name === "AbortError"))
	);
}
