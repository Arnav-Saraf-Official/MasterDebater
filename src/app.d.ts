// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		electronAPI?: {
			platform: NodeJS.Platform;
			openFileDialog: (options: Electron.OpenDialogOptions) => Promise<string[] | undefined>;
			saveFileDialog: (options: Electron.SaveDialogOptions) => Promise<string | undefined>;
		};
	}
}

export {};
