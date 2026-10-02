export type NonNullableDeep<T, P extends string> = P extends `${infer K}.${infer R}`
	? K extends keyof T
		? NonNullableDeep<NonNullable<T[K]>, R>
		: K extends `${number}`
			? T extends (infer U)[]
				? NonNullableDeep<NonNullable<U>, R>
				: never
			: never
	: P extends keyof T
		? NonNullable<T[P]>
		: never;

export type GqlResponse<T> =
	| {
			data: T;
			errors?: never;
	  }
	| {
			data?: never;
			errors: { message: string }[];
	  };

export interface Edge<T> {
	node?: T | null;
	cursor?: string | null;
}

export interface Connection<T> {
	edges?: readonly (Edge<T> | null)[] | null;
	pageInfo?: { hasNextPage: boolean } | null;
}

export function nodes<T>(connection: Connection<T> | null | undefined): T[] {
	const result: T[] = [];

	for (const edge of connection?.edges ?? []) {
		if (edge?.node != null) result.push(edge.node);
	}

	return result;
}
