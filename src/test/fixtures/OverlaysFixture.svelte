<script lang="ts">
	import { DialogClose, DialogTrigger } from "@ui-sdk/svelte/dialog";
	import { createPopoverController, PopoverTrigger } from "@ui-sdk/svelte/popover";
	import { TooltipTrigger } from "@ui-sdk/svelte/tooltip";

	import Button from "#lib/components/ui/Button.svelte";
	import Dialog from "#lib/components/ui/Dialog.svelte";
	import HintTooltip, { hintTooltip } from "#lib/components/ui/HintTooltip.svelte";
	import Popover from "#lib/components/ui/Popover.svelte";
	import Tooltip from "#lib/components/ui/Tooltip.svelte";
	import { dialogController } from "#lib/dialog.js";

	interface Props {
		onrestart?: () => Promise<unknown>;
	}

	const { onrestart }: Props = $props();

	const card = createPopoverController();
</script>

<DialogTrigger controller={dialogController("test-dialog")}>
	{#snippet render({ props })}
		<Button {...props}>Open dialog</Button>
	{/snippet}
</DialogTrigger>

<Dialog id="test-dialog" title="Test dialog" description="Opened by id.">
	<p>Dialog body</p>

	{#snippet footer()}
		<DialogClose>
			{#snippet render({ props })}
				<Button {...props} size="sm">Done</Button>
			{/snippet}
		</DialogClose>
	{/snippet}
</Dialog>

<Popover aria-label="Chat restrictions">
	{#snippet trigger(props)}
		<button {...props}>Restrictions</button>
	{/snippet}

	<p>Slow mode</p>
</Popover>

<PopoverTrigger controller={card}>Username</PopoverTrigger>

<Popover controller={card} aria-label="User card">
	<p>Card body</p>
</Popover>

<TooltipTrigger controller={hintTooltip} payload="Moderator">
	{#snippet render({ props })}
		<button {...props}>Badge</button>
	{/snippet}
</TooltipTrigger>

<HintTooltip />

<Tooltip>
	{#snippet trigger(props)}
		<Button {...props} aria-label="Restart" onclick={() => onrestart?.() ?? Promise.resolve()}>
			R
		</Button>
	{/snippet}

	Restart to update
</Tooltip>
