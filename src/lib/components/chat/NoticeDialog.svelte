<script lang="ts" module>
	export interface NoticeInput {
		title: string;
		options: string[];
		duration: number;
	}
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import { closeDialog } from "#lib/dialog.js";
	import { IconAdd, IconRemove } from "#lib/icons.js";

	import Button from "../ui/Button.svelte";
	import Dialog from "../ui/Dialog.svelte";
	import Field from "../ui/Field.svelte";
	import FieldSet from "../ui/FieldSet.svelte";
	import Input from "../ui/Input.svelte";
	import Select from "../ui/Select.svelte";

	const MIN_OPTIONS = 2;
	const OPTION_MAX = 25;
	const DEFAULT_DURATION = 120;

	interface Props {
		id: string;
		heading: string;
		description: string;
		placeholder: string;
		titleMax: number;

		/**
		 * What each option is called, e.g. "choice".
		 */
		noun: string;
		maxOptions: number;
		durationLabel: string;

		/**
		 * The selectable durations in seconds.
		 */
		durations: number[];
		submitLabel: string;

		/**
		 * Additional fields shown below the duration.
		 */
		children?: Snippet;
		onstart: (input: NoticeInput) => Promise<void>;
		onreset?: () => void;
	}

	const {
		id: dialogId,
		heading,
		description,
		placeholder,
		titleMax,
		noun,
		maxOptions,
		durationLabel,
		durations,
		submitLabel,
		children,
		onstart,
		onreset,
	}: Props = $props();

	let title = $state("");
	let options = $state(["", ""]);
	let duration = $state(DEFAULT_DURATION);
	let error = $state<string | null>(null);

	const label = $derived(noun[0].toUpperCase() + noun.slice(1));
	const validOptions = $derived(options.map((o) => o.trim()).filter(Boolean));
	const canSubmit = $derived(title.trim().length > 0 && validOptions.length >= MIN_OPTIONS);

	const durationOptions = $derived(
		durations.map((seconds) => ({ label: formatDurationLong(seconds), value: seconds })),
	);

	function formatDurationLong(seconds: number) {
		const [value, unit] = seconds < 60 ? [seconds, "second"] : [seconds / 60, "minute"];

		return new Intl.NumberFormat("en", {
			style: "unit",
			unit,
			unitDisplay: "long",
		}).format(value);
	}

	function reset() {
		title = "";
		options = ["", ""];
		duration = DEFAULT_DURATION;
		onreset?.();
	}

	async function start() {
		if (!canSubmit) return;

		error = null;

		try {
			await onstart({
				title: title.trim(),
				options: validOptions,
				duration,
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "An unknown error occurred.";
			return;
		}

		reset();
		closeDialog(dialogId);
	}
</script>

<Dialog
	id={dialogId}
	title={heading}
	{description}
	onOpenChange={(open) => {
		if (!open) error = null;
	}}
>
	<Field label="Question">
		<Input {placeholder} maxlength={titleMax} bind:value={title} />
	</Field>

	<FieldSet class="gap-1.5" legend="{label}s">
		{#each options as _, index (index)}
			<div class="flex items-center gap-1">
				<Input
					aria-label="{label} {index + 1}"
					placeholder="{label} {index + 1}"
					maxlength={OPTION_MAX}
					bind:value={options[index]}
				/>

				{#if options.length > MIN_OPTIONS}
					<Button
						class="shrink-0"
						size="icon"
						variant="ghost"
						aria-label="Remove {noun}"
						onclick={() => options.splice(index, 1)}
					>
						<IconRemove />
					</Button>
				{/if}
			</div>
		{/each}

		{#if options.length < maxOptions}
			<Button class="self-start" size="sm" variant="ghost" onclick={() => options.push("")}>
				<IconAdd />
				Add {noun}
			</Button>
		{/if}
	</FieldSet>

	<Field layout="inline" label={durationLabel}>
		<Select options={durationOptions} bind:value={duration} />
	</Field>

	{@render children?.()}

	{#if error}
		<p class="text-detail text-danger">{error}</p>
	{/if}

	{#snippet footer()}
		<Button size="sm" disabled={!canSubmit} onclick={start}>{submitLabel}</Button>
	{/snippet}
</Dialog>
