import type { SettingsCategory, SettingsField } from "./types";

function fieldText(field: SettingsField): string {
	const parts = [field.label ?? ""];

	if (field.type !== "group") {
		parts.push(field.id.replaceAll(".", " "));

		if (field.description) {
			// Descriptions may contain markup, which shouldn't match
			parts.push(field.description.replaceAll(/<[^>]*>/g, " "));
		}

		if (field.keywords) {
			parts.push(...field.keywords);
		}

		if (field.type === "radio" || field.type === "select") {
			for (const item of field.items) {
				parts.push(item.label, item.description ?? "");
			}
		}
	}

	return parts.join(" ").toLowerCase();
}

function matches(text: string, tokens: string[]): boolean {
	return tokens.every((token) => text.includes(token));
}

function filterFields(fields: SettingsField[], tokens: string[], context: string) {
	const result: SettingsField[] = [];

	for (const field of fields) {
		// Ancestor labels count towards a match, so "chat timestamps" works
		const text = `${context} ${fieldText(field)}`;

		if (field.type === "group") {
			if (matches(text, tokens)) {
				result.push(field);
				continue;
			}

			const nested = filterFields(field.fields, tokens, text);

			if (nested.length > 0) {
				result.push({ ...field, fields: nested });
			}
		} else if (matches(text, tokens)) {
			result.push(field);
		}
	}

	return result;
}

export function filterCategory(category: SettingsCategory, query: string): SettingsCategory {
	const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

	if (tokens.length === 0) {
		return category;
	}

	return {
		...category,
		fields: filterFields(category.fields, tokens, category.label.toLowerCase()),
	};
}

export function countFields(fields: SettingsField[]): number {
	let count = 0;

	for (const field of fields) {
		count += field.type === "group" ? countFields(field.fields) : 1;
	}

	return count;
}
