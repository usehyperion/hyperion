import { log } from "$lib/log";
import type { Handler } from "./helper";

export const handlers = new Map<string, Handler<any>>();

const imports = import.meta.glob<Handler<any>>(
	["./eventsub/*.ts", "./irc/*.ts", "./pubsub/*.ts", "./seventv/*.ts"],
	{ eager: true, import: "default" },
);

for (const handler of Object.values(imports)) {
	handlers.set(handler.name, handler);
}

log.info(`Registered ${handlers.size} handlers`);
