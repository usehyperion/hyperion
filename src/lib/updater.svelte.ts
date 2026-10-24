import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { type Update, check } from "@tauri-apps/plugin-updater";

import { log } from "./log.js";

export type UpdateStatus = "idle" | "downloading" | "ready";

class Updater {
	readonly #platform = platform();
	readonly #deferred = this.#platform !== "macos";

	#unlisten: (() => void) | null = null;

	public status = $state<UpdateStatus>("idle");

	/**
	 * The update announced by the server, if any.
	 */
	public update = $state.raw<Update | null>(null);

	public async check() {
		if (this.status !== "idle") return;

		try {
			this.update = await check();
		} catch (error) {
			await log.error(`Failed to check for updates: ${String(error)}`);
			return;
		}

		if (!this.update) return;

		this.status = "downloading";

		try {
			await this.update.download();

			if (this.#deferred) {
				await this.#installOnClose();
			} else {
				await this.update.install();
			}

			this.status = "ready";
		} catch (error) {
			this.status = "idle";
			await log.error(`Failed to install update: ${String(error)}`);
		}
	}

	public async restart() {
		if (this.#deferred) {
			// Installing now, so don't install again when the window closes.
			this.#unlisten?.();
			this.#unlisten = null;

			await this.update?.install();
		}

		// The Windows installer exits the app and relaunches it once it's done.
		if (this.#platform !== "windows") {
			await relaunch();
		}
	}

	/**
	 * Runs the installer when the main window is closed.
	 */
	async #installOnClose() {
		if (this.#unlisten) return;

		this.#unlisten = await getCurrentWindow().onCloseRequested(async () => {
			try {
				await this.update?.install({ restartAfterInstall: false });
			} catch (error) {
				await log.error(`Failed to install update on close: ${String(error)}`);
			}
		});
	}
}

export const updater = new Updater();
