import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createAgent } from "@ui-sdk/svelte/agent";
import { expect, test } from "vite-plus/test";

import ControlsForm from "../../../test/fixtures/ControlsForm.svelte";

const agent = createAgent();

function state() {
	return JSON.parse(screen.getByTestId("state").textContent ?? "{}");
}

test("field labels and descriptions are wired to their controls", async () => {
	render(ControlsForm);
	const user = userEvent.setup();

	const name = screen.getByLabelText<HTMLInputElement>("Display name");
	expect(name.tagName).toBe("INPUT");
	expect(name.getAttribute("aria-describedby")).toBeTruthy();
	expect(document.getElementById(name.getAttribute("aria-describedby")!)?.textContent).toBe(
		"Shown in chat.",
	);

	await user.click(screen.getByText("Display name"));
	expect(document.activeElement).toBe(name);

	await user.type(name, "hyperion");
	await user.type(screen.getByLabelText("Notes"), "hi");
	expect(state()).toMatchObject({ name: "hyperion", notes: "hi" });
});

test("number input steps with buttons and keys and stays in bounds", async () => {
	render(ControlsForm);
	const user = userEvent.setup();

	await user.click(screen.getByRole("button", { name: "Increase" }));
	expect(state().points).toBe(6);
	expect(screen.getByRole("button", { name: "Increase" }).hasAttribute("data-disabled")).toBe(
		true,
	);

	const field = screen.getByLabelText("Points per vote");
	await user.click(field);
	await user.keyboard("{ArrowDown}{ArrowDown}");
	expect(state().points).toBe(4);
});

test("input group button clears the bound value", async () => {
	render(ControlsForm);
	const user = userEvent.setup();

	await user.type(screen.getByRole("textbox", { name: "Search viewers" }), "abc");
	expect(state().search).toBe("abc");
	await user.click(screen.getByRole("button", { name: "Clear search" }));
	expect(state().search).toBe("");
});

test("an awaited press keeps the button pending and ignores repeats", async () => {
	let resolve!: () => void;
	let calls = 0;
	render(ControlsForm, {
		onsave: () => {
			calls++;
			return new Promise<void>((r) => (resolve = r));
		},
	});
	const user = userEvent.setup();
	const save = screen.getByRole("button", { name: "Save" });

	expect(save.hasAttribute("aria-busy")).toBe(false);
	expect(save.hasAttribute("aria-disabled")).toBe(false);

	await user.click(save);
	await user.click(save);
	expect(calls).toBe(1);
	expect(save.hasAttribute("data-pending")).toBe(true);
	expect(document.activeElement).toBe(save);

	resolve();
	await new Promise((r) => setTimeout(r, 0));
	expect(save.hasAttribute("data-pending")).toBe(false);
});

test("a disabled link leaves the tab order", () => {
	render(ControlsForm);
	const link = screen.getByText("Docs").closest("a")!;
	expect(link.getAttribute("tabindex")).toBe("-1");
	expect(link.getAttribute("aria-disabled")).toBe("true");
});

test("an agent can find and change every control", async () => {
	render(ControlsForm);

	const components = agent
		.snapshot()
		.filter((entry) => !entry.offPage && entry.component !== "more");
	for (const entry of components) {
		expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
	}
	const labels = components.map((entry) => entry.label);
	for (const label of ["Display name", "Notes", "Points per vote", "Search viewers", "Save"]) {
		expect(labels, `${label} is missing from the snapshot`).toContain(label);
	}

	const result = await agent.act({
		steps: [
			{ ref: "Display name", action: "setValue", args: ["Ada"] },
			{ ref: "Notes", action: "setValue", args: ["line"] },
			{ ref: "Points per vote", action: "setValue", args: [3] },
		],
	});
	expect(result.ok, result.error?.message).toBe(true);
	expect(state()).toMatchObject({ name: "Ada", notes: "line", points: 3 });
});
