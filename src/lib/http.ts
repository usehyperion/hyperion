import { ofetch } from "ofetch";

import { ApiError } from "./errors/api-error";

const TIMEOUT = 15_000;

interface RequestOptions<T> {
	method?: "GET" | "POST";
	headers?: HeadersInit;
	body?: Record<string, unknown>;

	/**
	 * The value to resolve with when the resource doesn't exist instead of
	 * throwing.
	 */
	notFound?: T;
}

/**
 * Fetches and parses a JSON resource, normalizing every failure into an
 * {@linkcode ApiError}.
 */
export async function fetchJson<T>(url: string, options: RequestOptions<T> = {}): Promise<T> {
	try {
		return await ofetch<T>(url, {
			method: options.method,
			headers: options.headers,
			body: options.body,
			signal: AbortSignal.timeout(TIMEOUT),
		});
	} catch (error) {
		const apiError = ApiError.from(error);

		if (apiError.status === 404 && options.notFound !== undefined) {
			return options.notFound;
		}

		throw apiError;
	}
}
