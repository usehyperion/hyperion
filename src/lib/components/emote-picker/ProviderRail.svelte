<script lang="ts">
	import type { EmoteSet } from "$lib/emotes";

	interface Props {
		sets: EmoteSet[];
		activeId: string;
		onselect: (id: string) => void;
	}

	const { sets, activeId, onselect }: Props = $props();
</script>

<div class="flex flex-col gap-3 overflow-y-auto p-2">
	{#each sets as set (set.id)}
		<button class="group" type="button" onclick={() => onselect(set.id)}>
			<img
				class={[
					"size-7 rounded-full object-contain ring-1 ring-black/10 dark:ring-white/10",
					activeId === set.id && "outline-1 outline-primary",
				]}
				src={set.owner.avatarUrl}
				alt={set.owner.displayName}
				decoding="async"
				loading="lazy"
			/>
		</button>
	{/each}
</div>
