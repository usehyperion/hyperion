import { invoke } from "@tauri-apps/api/core";

import { TWITCH_CLIENT_ID } from "$lib/graphql";
import { log } from "$lib/log";
import { dedupe } from "$lib/util";

export interface Integrity {
	token: string;
	deviceId: string;
	expiration: number;
}

export interface Credentials {
	accessToken: string;
	integrity: Integrity | null;
}

// Same skew as Rust
const INTEGRITY_EXPIRY_SKEW = 5 * 60 * 1000;

export function getCredentials() {
	return invoke<Credentials | null>("get_auth");
}

export class Session {
	public readonly accessToken: string;

	#integrity: Integrity | null;

	public constructor(credentials: Credentials) {
		this.accessToken = credentials.accessToken;
		this.#integrity = credentials.integrity;
	}

	public async headers() {
		const headers = new Headers({
			Authorization: `OAuth ${this.accessToken}`,
			"Client-Id": TWITCH_CLIENT_ID,
		});

		const integrity = await this.#fresh();

		if (integrity) {
			headers.set("Client-Integrity", integrity.token);
			headers.set("X-Device-Id", integrity.deviceId);
		}

		return headers;
	}

	async #fresh() {
		if (this.#integrity && Date.now() < this.#integrity.expiration - INTEGRITY_EXPIRY_SKEW) {
			return this.#integrity;
		}

		this.#integrity = await dedupe("twitch:integrity", () =>
			invoke<Integrity | null>("get_integrity"),
		).catch((error) => {
			void log
				.error(`Failed to refresh the integrity token: ${String(error)}`)
				.catch(() => {});

			return null;
		});

		return this.#integrity;
	}
}
