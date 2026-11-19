/**
 * Generates app icons from static/logo.svg.
 *
 * - Flat PNGs and the Windows ICO are rendered straight from the logo.
 * - The logo's three shapes are written into the Icon Composer document as
 *   layers, which ictool then renders into the macOS ICNS. Only this gets the
 *   background.
 *
 * The logo must keep its Top, Middle, and Bottom groups, each with one path.
 */

import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = resolve(import.meta.dirname, "..");

const logoPath = join(root, "static/logo.svg");
const outDir = join(root, "src-tauri/icons");
const iconDoc = join(outDir, "Hyperion.icon");

// https://developer.apple.com/download/all/?q=Icon%20Composer
const ictool = "/Applications/Icon Composer.app/Contents/Executables/ictool";

// Optical alignment for Icon Composer
const markTransform = "translate(222.47 182.47) scale(0.60392)";

const pngs = {
	"32x32.png": 32,
	"64x64.png": 64,
	"128x128.png": 128,
	"128x128@2x.png": 256,
	"icon.png": 512,
};

const icnsSizes = [16, 32, 128, 256, 512];

async function run(cmd: string, args: string[]) {
	await execFileAsync(cmd, args);
}

// The PNG32 prefix forces 8-bit RGBA; otherwise ImageMagick picks palette or
// 16-bit PNGs, which Tauri rejects.
function resize(input: string, size: number, output: string) {
	return run("magick", [input, "-resize", `${size}x${size}`, `PNG32:${output}`]);
}

async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function readLogo() {
	const svg = await readFile(logoPath, "utf8");
	const fill = /fill:\s*(#[\da-f]{3,8})/i.exec(svg)?.[1];

	if (!fill) {
		throw new Error(`No fill color found in ${logoPath}`);
	}

	const shapes = Object.fromEntries(
		["Top", "Middle", "Bottom"].map((id) => {
			const d = new RegExp(`<g id="${id}">\\s*<path[^>]*\\sd="([^"]+)"`).exec(svg)?.[1];

			if (!d) {
				throw new Error(`No path found for group "${id}" in ${logoPath}`);
			}

			return [id.toLowerCase(), d];
		}),
	);

	return { fill, shapes };
}

// Tauri v3 will support .icon files so just doing this preemptively
async function writeIconLayers({ fill, shapes }: Awaited<ReturnType<typeof readLogo>>) {
	await Promise.all(
		Object.entries(shapes).map(([name, d]) => {
			const svg = [
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">`,
				`\t<path transform="${markTransform}" fill="${fill}" d="${d}"/>`,
				`</svg>`,
				"",
			].join("\n");

			return writeFile(join(iconDoc, "Assets", `${name}.svg`), svg);
		}),
	);

	console.log(`Updated layers in ${iconDoc} (fill ${fill})`);
}

async function generateFlat(tmp: string) {
	const master = join(tmp, "logo.png");

	await run("magick", [
		"-background",
		"none",
		"-density",
		"300",
		logoPath,
		"-resize",
		"1024x1024",
		master,
	]);

	await Promise.all([
		...Object.entries(pngs).map(([file, size]) => resize(master, size, join(outDir, file))),
		run("magick", [
			master,
			"-depth",
			"8",
			"-define",
			"icon:auto-resize=256,128,64,48,32,24,16",
			"-compress",
			"zip",
			join(outDir, "icon.ico"),
		]),
	]);

	console.log(`Generated PNGs and ICO in ${outDir}`);
}

async function generateIcns(tmp: string) {
	if (process.platform !== "darwin" || !(await exists(ictool))) {
		console.warn("WARN: Icon Composer not found, skipping ICNS");
		return;
	}

	// ictool needs a file to write to
	const render = join(tmp, "macos.png");

	await writeFile(render, "");
	await run(ictool, [iconDoc, "--export-preview", "macOS", "Light", "1024", "1024", "1", render]);

	if ((await stat(render)).size === 0) {
		throw new Error("ictool did not render the icon");
	}

	const iconset = join(tmp, "icon.iconset");

	await mkdir(iconset);
	await Promise.all(
		icnsSizes.flatMap((size) => [
			resize(render, size, join(iconset, `icon_${size}x${size}.png`)),
			resize(render, size * 2, join(iconset, `icon_${size}x${size}@2x.png`)),
		]),
	);

	await run("iconutil", ["-c", "icns", iconset, "-o", join(outDir, "icon.icns")]);

	console.log(`Generated ICNS in ${outDir}`);
}

const tmp = await mkdtemp(join(tmpdir(), "hyperion-icons-"));

try {
	await writeIconLayers(await readLogo());
	await Promise.all([generateFlat(tmp), generateIcns(tmp)]);
} finally {
	await rm(tmp, { recursive: true, force: true });
}
