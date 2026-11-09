import { log } from "#lib/log.js";

import type { Handler, Source } from "./helper";

const handlers = new Map<string, Handler>();

const imports = import.meta.glob<Handler>(["./irc/*.ts", "./pubsub/*.ts", "./seventv/*.ts"], {
	eager: true,
	import: "default",
});

for (const handler of Object.values(imports)) {
	handlers.set(`${handler.source}:${handler.name}`, handler);
}

log.info(`Registered ${handlers.size} handlers`);

/**
 * Hands a message from the backend to the handler registered for its source
 * and key.
 */
export async function dispatch(source: Source, key: string, payload: any) {
	await handlers.get(`${source}:${key}`)?.handle(payload);
}
