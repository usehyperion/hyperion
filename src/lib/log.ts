import { invoke } from "@tauri-apps/api/core";

/**
 * The log levels from least to most verbose, matching the backend's.
 */
export const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

function write(level: LogLevel, message: string) {
	// Logging must never become another error to handle.
	invoke("log", { level, message }).catch((error: unknown) => {
		console.error(`Failed to write log: ${String(error)}`, message);
	});
}

export const log = {
	trace: (message: string) => write("trace", message),
	debug: (message: string) => write("debug", message),
	info: (message: string) => write("info", message),
	warn: (message: string) => write("warn", message),
	error: (message: string) => write("error", message),
};
