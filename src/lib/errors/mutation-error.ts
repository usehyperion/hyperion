export class MutationError extends Error {
	public constructor(
		/**
		 * The payload's error code.
		 */
		public readonly code: string,

		/**
		 * The mutation field that reported the error.
		 */
		public readonly field: string,
	) {
		super(`${field} failed: ${code}`);

		this.name = "MutationError";
	}
}
