import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createAgent } from "@ui-sdk/svelte/agent";
import { expect, test } from "vite-plus/test";

import { closeDialog, openDialog } from "#lib/dialog.js";

import OverlaysFixture from "../../../test/fixtures/OverlaysFixture.svelte";

const agent = createAgent();

test("a dialog trigger opens the dialog by id and focus returns to it on close", async () => {
	render(OverlaysFixture);
	const user = userEvent.setup();
	const trigger = screen.getByRole("button", { name: "Open dialog" });

	await user.click(trigger);
	const dialog = await screen.findByRole("dialog", { name: "Test dialog" });
	expect(dialog.textContent).toContain("Dialog body");

	await user.keyboard("{Escape}");
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	expect(document.activeElement).toBe(trigger);
});

test("openDialog and closeDialog drive a dialog from code", async () => {
	render(OverlaysFixture);

	void openDialog("test-dialog");
	await screen.findByRole("dialog", { name: "Test dialog" });

	closeDialog("test-dialog");
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("a dialog close part closes it", async () => {
	render(OverlaysFixture);
	const user = userEvent.setup();

	await user.click(screen.getByRole("button", { name: "Open dialog" }));
	await screen.findByRole("dialog", { name: "Test dialog" });
	await user.click(screen.getByRole("button", { name: "Done" }));
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("the popover trigger snippet opens a named popover", async () => {
	render(OverlaysFixture);
	const user = userEvent.setup();

	await user.click(screen.getByRole("button", { name: "Restrictions" }));
	const popover = await screen.findByRole("dialog", { name: "Chat restrictions" });
	expect(popover.textContent).toContain("Slow mode");
});

test("a user card opens from its external trigger on the first press", async () => {
	render(OverlaysFixture);
	const user = userEvent.setup();
	const username = screen.getByRole("button", { name: "Username" });

	await user.click(username);
	const card = await screen.findByRole("dialog", { name: "User card" });
	expect(card.textContent).toContain("Card body");

	await user.keyboard("{Escape}");
	await waitFor(() => expect(screen.queryByRole("dialog", { name: "User card" })).toBeNull());
	expect(document.activeElement).toBe(username);

	await user.click(username);
	await screen.findByRole("dialog", { name: "User card" });
});

test("a closed user card keeps no content in the page", () => {
	render(OverlaysFixture);
	expect(screen.queryByText("Card body")).toBeNull();
});

test("the shared hint tooltip shows the focused trigger's payload", async () => {
	render(OverlaysFixture);
	const user = userEvent.setup();

	await user.hover(screen.getByRole("button", { name: "Badge" }));

	await waitFor(() => expect(screen.getByRole("tooltip").textContent).toBe("Moderator"));
});

test("a tooltip trigger keeps the button's awaited click", async () => {
	let calls = 0;
	render(OverlaysFixture, {
		onrestart: async () => {
			calls++;
		},
	});
	const user = userEvent.setup();

	await user.click(screen.getByRole("button", { name: "Restart" }));
	expect(calls).toBe(1);
});

test("an agent can find every overlay trigger by name", () => {
	render(OverlaysFixture);

	const labels = agent
		.snapshot()
		.filter((entry) => !entry.offPage && entry.component !== "more")
		.map((entry) => entry.label);

	for (const label of ["Open dialog", "Restrictions", "Username", "Restart"]) {
		expect(labels, `${label} is missing from the snapshot`).toContain(label);
	}
});
