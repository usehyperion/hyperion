<script lang="ts" module>
	export interface NoticeInput {
		title: string;
		options: string[];
		duration: number;
	}
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import Plus from "~icons/ph/plus";
	import X from "~icons/ph/x";

	import Button from "../ui/Button.svelte";
	import Dialog from "../ui/Dialog.svelte";
	import * as Field from "../ui/field";
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

	const id = $props.id();

	let title = $state("");
	let options = $state(["", ""]);
	let duration = $state(DEFAULT_DURATION);

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

		await onstart({
			title: title.trim(),
			options: validOptions,
			duration,
		});

		reset();
	}
</script>

<Dialog id={dialogId}>
	{#snippet header()}
		<h2>{heading}</h2>
		<p>{description}</p>
	{/snippet}

	<Field.Field>
		<Field.Label for="title-{id}">Question</Field.Label>

		<Input id="title-{id}" {placeholder} maxlength={titleMax} bind:value={title} />
	</Field.Field>

	<Field.Field>
		<Field.Label>{label}s</Field.Label>

		{#each options as _, index (index)}
			<div class="flex items-center gap-1">
				<Input
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
						<X />
					</Button>
				{/if}
			</div>
		{/each}

		{#if options.length < maxOptions}
			<Button class="self-start" size="sm" variant="ghost" onclick={() => options.push("")}>
				<Plus />
				Add {noun}
			</Button>
		{/if}
	</Field.Field>

	<Field.Field>
		<Field.Label for="duration-{id}">{durationLabel}</Field.Label>

		<Select id="duration-{id}" options={durationOptions} bind:value={duration} />
	</Field.Field>

	{@render children?.()}

	{#snippet footer()}
		<Button disabled={!canSubmit} onclickwait={start}>{submitLabel}</Button>
	{/snippet}
</Dialog>
