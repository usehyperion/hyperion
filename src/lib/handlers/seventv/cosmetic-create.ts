import { app } from "#lib/app.svelte.js";
import { BADGE_SETS, Badge } from "#lib/models/badge.js";
import { sevenTvFileUrl } from "#lib/seventv.js";

import { defineHandler } from "../helper";

function toRgb(decimal: number) {
	const r = (decimal >>> 24) & 255;
	const g = (decimal >>> 16) & 255;
	const b = (decimal >>> 8) & 255;
	const a = (decimal & 255) / 255;

	return `rgb(${r} ${g} ${b} / ${a.toFixed(2)})`;
}

export default defineHandler("seventv", {
	name: "cosmetic.create",
	handle(cosmetic) {
		if (cosmetic.kind === "BADGE") {
			const { host } = cosmetic.data;
			const file = host.files.find((f) => f.name.startsWith("4x"))!;

			const badge = new Badge({
				setId: BADGE_SETS.seventv,
				version: cosmetic.id,
				title: cosmetic.data.name,
				description: cosmetic.data.tooltip,
				imageUrl: sevenTvFileUrl(host, file),
			});

			app.badges.set(badge.id, badge);

			return;
		}

		const args: string[] = [];

		switch (cosmetic.data.function) {
			case "LINEAR_GRADIENT": {
				args.push(`${cosmetic.data.angle}deg`);
				break;
			}

			case "RADIAL_GRADIENT": {
				args.push(cosmetic.data.shape);
				break;
			}

			case "URL": {
				args.push(cosmetic.data.image_url);
				break;
			}
		}

		if (cosmetic.data.function !== "URL") {
			for (const stop of cosmetic.data.stops) {
				args.push(`${toRgb(stop.color)} ${stop.at * 100}%`);
			}
		}

		const cssFunction =
			(cosmetic.data.repeat ? "repeating-" : "") +
			cosmetic.data.function.toLowerCase().replace(/_/g, "-");

		const shadows = cosmetic.data.shadows.map(
			(shadow) =>
				`drop-shadow(${shadow.x_offset}px ${shadow.y_offset}px ${shadow.radius}px ${toRgb(shadow.color)})`,
		);

		const css = [
			`background-color: currentcolor`,
			`background-image: ${cssFunction}(${args.join(", ")})`,
			`background-size: 100% 100%`,
			`background-clip: text`,
			`filter: ${shadows.join(" ")}`,
			`-webkit-text-fill-color: transparent`,
		].join(";");

		app.cosmetics.paints.set(cosmetic.id, { name: cosmetic.data.name, css });
	},
});
