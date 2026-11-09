import { command } from "../define";

export default command({
	name: "block-term",
	description: "Block a term and prevent it from being used in chat",
	permission: "mod",
	args: [
		{
			type: "text",
			name: "term",
		},
	],
	async exec(args, channel) {
		await channel.blockTerm(args.term);
	},
});
