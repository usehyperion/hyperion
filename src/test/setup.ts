import { cleanup } from "@testing-library/svelte";
import { afterEach } from "vite-plus/test";

declare global {
	// oxlint-disable-next-line no-underscore-dangle -- ui-sdk reads this exact global
	var __UI_SDK_STRICT__: boolean | undefined;
}

// oxlint-disable-next-line no-underscore-dangle
globalThis.__UI_SDK_STRICT__ = true;

HTMLElement.prototype.showPopover = function () {};
HTMLElement.prototype.hidePopover = function () {};
Element.prototype.getAnimations = () => [];
Element.prototype.scrollIntoView = function () {};
Element.prototype.checkVisibility = () => true;
const noRects = document.createElement("div").getClientRects();
Element.prototype.getClientRects = () => noRects;
document.elementFromPoint = () => null;
document.elementsFromPoint = () => [];
globalThis.ResizeObserver ??= class {
	public observe() {}
	public unobserve() {}
	public disconnect() {}
};
document.head.append(
	Object.assign(document.createElement("style"), {
		textContent: "[popover] { display: block !important }",
	}),
);

afterEach(cleanup);
