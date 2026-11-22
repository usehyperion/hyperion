<script lang="ts">
	import { Meter, MeterIndicator, MeterTrack, type NumberFormat } from "@ui-sdk/svelte/meter";
	import type { ClassValue, HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
		value: number;
		min?: number;
		max?: number;
		format?: NumberFormat;
		indicatorClass?: ClassValue;
	}

	let { class: className, indicatorClass, ...rest }: Props = $props();
</script>

<Meter class={cn("flex h-1 w-full", className)} {...rest}>
	<MeterTrack class="h-full w-full overflow-hidden rounded-full bg-surface-3">
		<MeterIndicator
			class={cn(
				"h-full rounded-full bg-fg-muted transition-[width] duration-300 ease-out-quart motion-reduce:transition-none",
				indicatorClass,
			)}
		/>
	</MeterTrack>
</Meter>
