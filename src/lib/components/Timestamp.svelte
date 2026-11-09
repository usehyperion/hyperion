<script lang="ts" module>
	const HOUR_FORMATS = {
		12: "h:mm A",
		24: "HH:mm",
	} as const;

	// Cache the locale instance
	const localeFormat = new Intl.Locale(navigator.language).getHourCycles().includes("h12")
		? HOUR_FORMATS[12]
		: HOUR_FORMATS[24];
</script>

<script lang="ts">
	import dayjs from "dayjs";

	import { settings } from "#lib/settings.js";

	interface Props {
		date: Date;
	}

	const { date }: Props = $props();

	const format = $derived.by(() => {
		const format = settings.state["chat.messages.timestamps.format"];
		const customFormat = settings.state["chat.messages.timestamps.customFormat"];

		if (format === "custom" && customFormat) {
			return customFormat;
		}

		if (format === "12" || format === "24") {
			return HOUR_FORMATS[format];
		}

		return localeFormat;
	});

	const formatted = $derived(dayjs(date).format(format));
</script>

{#if settings.state["chat.messages.timestamps.show"]}
	<time class="text-xs text-muted-foreground tabular-nums" datetime={date.toISOString()}>
		{formatted}
	</time>
{/if}
