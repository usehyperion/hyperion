<script lang="ts">
	import type { Poll } from "$lib/models/channel.svelte";

	interface Props {
		poll: Poll;
	}

	const { poll }: Props = $props();

	const totalVotes = $derived(poll.choices.reduce((sum, c) => sum + c.votes, 0));
</script>

<div class="flex flex-col gap-4">
	<h2>{poll.title}</h2>

	{#each poll.choices as choice (choice.id)}
		<div class="flex flex-col gap-2">
			<label for={choice.id}>{choice.title}</label>

			<meter id={choice.id} class="h-2 rounded-full">
				{choice.votes}
			</meter>
		</div>
	{/each}
</div>
