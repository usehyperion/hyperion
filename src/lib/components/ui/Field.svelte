<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type FieldLayout = "stack" | "inline" | "row" | "choice";
	export type FieldText = string | Snippet;
</script>

<script lang="ts">
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldLabel,
		type FieldOptions,
	} from "@ui-sdk/svelte/field";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	type BaseProps = HTMLAttributes<HTMLElement> & Omit<FieldOptions, "debug">;

	interface Props extends BaseProps {
		label?: FieldText;
		description?: FieldText;
		error?: string;
		layout?: FieldLayout;
		trailing?: boolean;
	}

	const {
		class: className,
		label,
		description,
		error,
		layout = "stack",
		trailing = false,
		name,
		disabled,
		invalid,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();

	const layouts = {
		stack: "flex flex-col gap-1.5",
		inline: "grid grid-cols-[minmax(6rem,38%)_minmax(0,1fr)] items-center gap-x-3 gap-y-1",
		row: "flex items-center justify-between gap-4",
	};

	// A wrapping label names its control with all of its text, so point the control at the label and description parts instead.
	function wire(node: HTMLElement) {
		const control = node.querySelector<HTMLElement>(
			"[role=radio], [role=checkbox], [role=switch], input, button",
		);
		if (!control) return;

		if (label) {
			control.setAttribute("aria-labelledby", `${uid}-label`);
		}

		if (description) {
			control.setAttribute("aria-describedby", `${uid}-description`);
		}

		return () => {
			control.removeAttribute("aria-labelledby");
			control.removeAttribute("aria-describedby");
		};
	}
</script>

{#snippet text(value: FieldText)}
	{#if typeof value === "function"}{@render value()}{:else}{value}{/if}
{/snippet}

{#snippet labelPart()}
	{#if label}
		<FieldLabel
			class={cn(
				"w-fit text-body leading-5 font-medium text-fg select-none",
				"data-disabled:opacity-50 data-invalid:text-danger",
				layout === "inline" && "w-auto truncate font-normal text-fg-muted",
			)}
		>
			{@render text(label)}
		</FieldLabel>
	{/if}
{/snippet}

{#snippet descriptionPart()}
	{#if description}
		<FieldDescription
			class={cn(
				"text-caption/relaxed text-fg-muted data-disabled:opacity-50",
				"[&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-fg",
				layout === "inline" && "col-start-2",
			)}
		>
			{@render text(description)}
		</FieldDescription>
	{/if}
{/snippet}

{#snippet errorPart()}
	{#if error}
		<FieldError
			match
			class={cn("text-caption text-danger", layout === "inline" && "col-start-2")}
		>
			{error}
		</FieldError>
	{/if}
{/snippet}

{#if layout === "choice"}
	<label
		class={cn(
			"flex cursor-pointer items-start gap-2.5 select-none",
			"has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50",
			trailing && "flex-row-reverse justify-between",
			className,
		)}
		data-slot="field"
		data-layout="choice"
		{...rest}
		{@attach wire}
	>
		<span class="flex h-5 shrink-0 items-center">{@render children?.()}</span>

		{#if label || description}
			<span class="flex min-w-0 flex-col gap-0.5">
				{#if label}
					<span class="text-body leading-5 text-fg" id="{uid}-label">
						{@render text(label)}
					</span>
				{/if}

				{#if description}
					<span class="text-caption/relaxed text-fg-muted" id="{uid}-description">
						{@render text(description)}
					</span>
				{/if}
			</span>
		{/if}
	</label>
{:else}
	<Field
		class={cn(layouts[layout], className)}
		data-layout={layout}
		{name}
		{disabled}
		invalid={error ? true : invalid}
		{...rest}
	>
		{#if layout === "row"}
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				{@render labelPart()}
				{@render descriptionPart()}
				{@render errorPart()}
			</div>

			<div class="flex shrink-0 items-center">{@render children?.()}</div>
		{:else if layout === "inline"}
			{@render labelPart()}
			{@render children?.()}
			{@render descriptionPart()}
			{@render errorPart()}
		{:else}
			{#if label || description}
				<div class="flex flex-col gap-0.5">
					{@render labelPart()}
					{@render descriptionPart()}
				</div>
			{/if}

			{@render children?.()}
			{@render errorPart()}
		{/if}
	</Field>
{/if}
