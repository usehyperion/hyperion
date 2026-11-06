import { invoke } from "@tauri-apps/api/core";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

const fallback = {
	trace: console.debug,
	debug: console.debug,
	info: console.info,
	warn: console.warn,
	error: console.error,
} satisfies Record<LogLevel, (...data: unknown[]) => void>;

function describe(cause: unknown): string {
	if (cause instanceof Error) return cause.toString();
	if (typeof cause === "string") return cause;

	try {
		return JSON.stringify(cause);
	} catch {
		return Object.prototype.toString.call(cause);
	}
}

async function emit(level: LogLevel, message: string, cause?: unknown): Promise<void> {
	const text = cause === undefined ? message : `${message}: ${describe(cause)}`;

	try {
		return await invoke<void>("log", { level, message: text });
	} catch (invokeError) {
		fallback[level](text);
		console.error("Failed to forward log to backend:", invokeError);
	}
}

export const log = {
	trace: (message: string) => emit("trace", message),
	debug: (message: string) => emit("debug", message),
	info: (message: string) => emit("info", message),
	warn: (message: string, cause?: unknown) => emit("warn", message, cause),
	error: (message: string, cause?: unknown) => emit("error", message, cause),
	catch: (message: string) => (cause: unknown) => emit("error", message, cause),
};
