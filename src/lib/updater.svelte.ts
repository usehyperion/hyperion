import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { type Update, check } from "@tauri-apps/plugin-updater";

import { openDialog } from "./components/ui/Dialog.svelte";
import { log } from "./log.js";
import { settings } from "./settings/index.js";

export const UPDATE_DIALOG_ID = "update-dialog";

export type UpdateStatus = "idle" | "available" | "downloading" | "ready" | "error";

class Updater {
	#unlisten: (() => void) | null = null;

	public status = $state<UpdateStatus>("idle");

	/**
	 * The update announced by the server, if any.
	 */
	public update = $state.raw<Update | null>(null);

	/**
	 * The number of bytes downloaded so far.
	 */
	public downloaded = $state(0);

	/**
	 * The size of the update in bytes, if the server reported it.
	 */
	public total = $state<number | null>(null);

	public error = $state<string | null>(null);

	/**
	 * Whether the update is applied by launching an installer that exits the
	 * app, rather than by swapping the bundle on disk.
	 */
	public readonly deferred = platform() === "windows";

	public async check() {
		if (this.status !== "idle") return;

		try {
			this.update = await check();
		} catch (error) {
			await log.error(`Failed to check for updates: ${String(error)}`);
			return;
		}

		if (!this.update) return;

		if (settings.state["advanced.updates.autoInstall"]) {
			await this.download({ silent: true });
		} else {
			this.status = "available";
			openDialog(UPDATE_DIALOG_ID);
		}
	}

	/**
	 * Downloads the update and, where possible, installs it so it takes effect
	 * on the next launch.
	 */
	public async download({ silent = false } = {}) {
		if (!this.update || this.status === "downloading") return;

		this.status = "downloading";
		this.downloaded = 0;
		this.total = null;
		this.error = null;

		try {
			await this.update.download((event) => {
				if (event.event === "Started") {
					this.total = event.data.contentLength ?? null;
				} else if (event.event === "Progress") {
					this.downloaded += event.data.chunkLength;
				}
			});

			if (this.deferred) {
				await this.#installOnClose();
			} else {
				await this.update.install();
			}

			this.status = "ready";
			openDialog(UPDATE_DIALOG_ID);
		} catch (error) {
			this.status = "error";
			this.error = error instanceof Error ? error.message : String(error);

			await log.error(`Failed to install update: ${this.error}`);

			if (!silent) openDialog(UPDATE_DIALOG_ID);
		}
	}

	public async restart() {
		if (this.deferred) {
			// The installer exits the app and relaunches it once it's done.
			await this.update?.install();
		} else {
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
