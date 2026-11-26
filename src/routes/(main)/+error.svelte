<script lang="ts">
	import { page } from "$app/state";

	import Empty from "#lib/components/ui/Empty.svelte";
	import Link from "#lib/components/ui/Link.svelte";
	import { IconError } from "#lib/icons.js";
	import { log } from "#lib/log.js";

	if (page.error) {
		log.error(`[${page.status}]: ${page.error.message}`);
	}
</script>

<Empty
	class="h-full"
	icon={IconError}
	title="This is awkward..."
	description="Something went wrong. If this issue persists, please file an issue."
>
	<Link href="https://github.com/usehyperion/hyperion/issues">File an issue</Link>
</Empty>
