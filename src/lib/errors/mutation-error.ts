export class MutationError extends Error {
	public constructor(
		public readonly code: string,
		field: string,
	) {
		super(`${field} failed: ${code}`);

		this.name = "MutationError";
	}
}
