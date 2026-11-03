import { invoke } from "@tauri-apps/api/core";

type Level = "trace" | "debug" | "info" | "warn" | "error";

const fallback = {
	trace: console.debug,
	debug: console.debug,
	info: console.info,
	warn: console.warn,
	error: console.error,
} satisfies Record<Level, (...data: unknown[]) => void>;

function describe(cause: unknown): string {
	if (cause instanceof Error) return cause.toString();
	if (typeof cause === "string") return cause;

	try {
		return JSON.stringify(cause);
	} catch {
		return Object.prototype.toString.call(cause);
	}
}

async function emit(level: Level, message: string, cause?: unknown): Promise<void> {
	const text = cause === undefined ? message : `${message}: ${describe(cause)}`;

	try {
		return await invoke<void>("log", { level, message: text });
	} catch (invokeError) {
		fallback[level](text);
		console.error("Failed to forward log to backend:", invokeError);
	}
}

export const trace = (message: string) => emit("trace", message);
export const debug = (message: string) => emit("debug", message);
export const info = (message: string) => emit("info", message);
export const warn = (message: string, cause?: unknown) => emit("warn", message, cause);
export const error = (message: string, cause?: unknown) => emit("error", message, cause);

export const log = {
	trace,
	debug,
	info,
	warn,
	error,
};

export function logError(message: string) {
	return (cause: unknown) => void emit("error", message, cause);
}
