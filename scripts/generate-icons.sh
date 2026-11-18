#!/bin/bash

set -euo pipefail

usage() {
	echo "Usage: $0 [-a apple_icon.png] icon.png" >&2
	exit 1
}

apple_file=""

while getopts 'a:h' flag; do
	case "${flag}" in
		a) apple_file="${OPTARG}" ;;
		*) usage ;;
	esac
done

shift $((OPTIND - 1))

[[ $# -eq 1 ]] || usage

icon=$1
apple_file=${apple_file:-$icon}

for file in "$icon" "$apple_file"; do
	[[ -f "$file" ]] || { echo "File not found: $file" >&2; exit 1; }
done

if ! command -v magick >/dev/null 2>&1; then
	echo "ERROR: magick is not installed (https://imagemagick.org/script/download.php)" >&2
	exit 1
fi

out_dir="$(cd "$(dirname "$0")/.." && pwd)/src-tauri/icons"

generate_icns() {
	local iconset
	iconset="$(mktemp -d)/icon.iconset"
	mkdir "$iconset"

	sips -z 16  16  "$apple_file" -o "$iconset/icon_16x16.png"
	sips -z 32  32  "$apple_file" -o "$iconset/icon_16x16@2x.png"
	sips -z 32  32  "$apple_file" -o "$iconset/icon_32x32.png"
	sips -z 64  64  "$apple_file" -o "$iconset/icon_32x32@2x.png"
	sips -z 128 128 "$apple_file" -o "$iconset/icon_128x128.png"
	sips -z 256 256 "$apple_file" -o "$iconset/icon_128x128@2x.png"
	sips -z 256 256 "$apple_file" -o "$iconset/icon_256x256.png"
	sips -z 512 512 "$apple_file" -o "$iconset/icon_256x256@2x.png"
	sips -z 512 512 "$apple_file" -o "$iconset/icon_512x512.png"
	cp "$apple_file" "$iconset/icon_512x512@2x.png"

	iconutil -c icns "$iconset" -o "$out_dir/icon.icns"

	rm -rf "$(dirname "$iconset")"

	echo "Generated ICNS in $out_dir"
}

generate_ico() {
	magick "$icon" -define icon:auto-resize=256,128,64,48,32,24,16 -compress zip "$out_dir/icon.ico"

	echo "Generated ICO in $out_dir"
}

generate_pngs() {
	magick "$icon" -resize 32x32   "$out_dir/32x32.png"
	magick "$icon" -resize 64x64   "$out_dir/64x64.png"
	magick "$icon" -resize 128x128 "$out_dir/128x128.png"
	magick "$icon" -resize 256x256 "$out_dir/128x128@2x.png"
	magick "$icon" -resize 512x512 "$out_dir/icon.png"

	echo "Generated PNGs in $out_dir"
}

if [[ "$(uname -s)" == "Darwin" ]]; then
	generate_icns
else
	echo "WARN: sips and iconutil are unavailable on this platform" >&2
	echo "WARN: Run this script on macOS to generate the .icns file" >&2
fi

generate_ico
generate_pngs
