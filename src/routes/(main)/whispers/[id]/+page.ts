import { error } from "@sveltejs/kit";

export async function load({ parent, params }) {
	const { whispers } = await parent();
	const whisper = whispers.get(params.id);

	if (!whisper) error(404);

	await whisper.load();

	return { whisper };
}
