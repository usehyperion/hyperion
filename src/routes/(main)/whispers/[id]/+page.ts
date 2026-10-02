import { error } from "@sveltejs/kit";

import { log } from "#lib/log.js";

export async function load({ parent, params }) {
	const { whispers } = await parent();
	const whisper = whispers.get(params.id);

	if (!whisper) error(404);

	try {
		await whisper.load();
	} catch (err) {
		void log.error(`Failed to load whisper history: ${String(err)}`);
	}

	return { whisper };
}
