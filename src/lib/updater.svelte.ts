import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { type Update, check } from "@tauri-apps/plugin-updater";

import { log } from "./log.js";

class Updater {
	readonly #platform = platform();
	readonly #deferred = this.#platform !== "macos";

	#pending = false;
	#unlisten: (() => void) | null = null;

	/**
	 * Whether an update has been downloaded and is waiting for a restart.
	 */
	public ready = $state(false);

	/**
	 * Whether the last attempt to restart into the update failed.
	 */
	public failed = $state(false);

	/**
	 * The downloaded update, if any.
	 */
	public update = $state.raw<Update | null>(null);

	public async check() {
		if (this.#pending || this.ready) return;
		this.#pending = true;

		let update: Update | null = null;

		try {
			update = await check();
			if (!update) return;

			await update.download();

			this.update = update;

			if (this.#deferred) {
				await this.#installOnClose();
			} else {
				await update.install();
			}

			this.ready = true;
		} catch (error) {
			this.update = null;
			await update?.close();
			await log.error(`Failed to update: ${String(error)}`);
		} finally {
			this.#pending = false;
		}
	}

	public async restart() {
		this.failed = false;

		try {
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
		} catch (error) {
			this.failed = true;
			await log.error(`Failed to restart to update: ${String(error)}`);
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
