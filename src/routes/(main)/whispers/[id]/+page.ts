import { error } from "@sveltejs/kit";

export async function load({ parent, params }) {
	const { whispers } = await parent();
	const whisper = whispers.get(params.id);

	if (!whisper) error(404);

	try {
		await whisper.load();
	} catch (err) {
		error(502, `Failed to load whisper history: ${String(err)}`);
	}

	return { whisper };
}
