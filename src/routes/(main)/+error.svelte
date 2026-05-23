<script lang="ts">
	import { page } from "$app/state";
	import { Button } from "$lib/components/ui/button";
	import * as Empty from "$lib/components/ui/empty";
	import { log } from "$lib/log";
	import WarningCircle from "~icons/ph/warning-circle";

	if (page.error) {
		log.error(`[${page.status}]: ${page.error.message}`);
	}
</script>

<Empty.Root class="h-full">
	<Empty.Header>
		<Empty.Media variant="icon">
			<WarningCircle />
		</Empty.Media>

		<Empty.Title>This is awkward...</Empty.Title>

		<Empty.Description>
			Something went wrong. If this issue persists, please file an issue.
		</Empty.Description>
	</Empty.Header>

	<Empty.Content>
		<Button href="https://github.com/usehyperion/hyperion/issues">File an issue</Button>
	</Empty.Content>
</Empty.Root>
