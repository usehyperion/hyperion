<script lang="ts">
	import { page } from "$app/state";

	import * as Empty from "#lib/components/ui/empty/index.js";
	import Link from "#lib/components/ui/Link.svelte";
	import { IconError } from "#lib/icons.js";
	import { log } from "#lib/log.js";

	if (page.error) {
		log.error(`[${page.status}]: ${page.error.message}`);
	}
</script>

<Empty.Root class="h-full">
	<Empty.Header>
		<Empty.Media variant="icon">
			<IconError />
		</Empty.Media>

		<Empty.Title>This is awkward...</Empty.Title>

		<Empty.Description>
			Something went wrong. If this issue persists, please file an issue.
		</Empty.Description>
	</Empty.Header>

	<Empty.Content>
		<Link href="https://github.com/usehyperion/hyperion/issues">File an issue</Link>
	</Empty.Content>
</Empty.Root>
