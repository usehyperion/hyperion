<script lang="ts" module>
	const localeFormat = new Intl.Locale(navigator.language).getHourCycles().includes("h12")
		? "h:mm A"
		: "HH:mm";
</script>

<script lang="ts">
	import dayjs from "dayjs";
	import { settings } from "$lib/settings";

	interface Props {
		date: Date;
	}

	const { date }: Props = $props();

	const format = $derived.by(() => {
		let format = settings.state["chat.messages.timestamps.format"];

		if (format === "custom") {
			if (settings.state["chat.messages.timestamps.customFormat"]) {
				return settings.state["chat.messages.timestamps.customFormat"];
			}

			format = "auto";
		}

		if (format === "auto") {
			return localeFormat;
		}

		return format === "12" ? "h:mm A" : "HH:mm";
	});

	const formatted = $derived(dayjs(date).format(format));
</script>

{#if settings.state["chat.messages.timestamps.show"]}
	<time class="text-xs text-muted-foreground tabular-nums" datetime={date.toISOString()}>
		{formatted}
	</time>
{/if}
