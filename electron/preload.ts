import { contextBridge, dialog, ipcRenderer } from 'electron';

// Expose a minimal API surface to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
	platform: process.platform,

	// File dialog helpers — expand as needed
	openFileDialog: (options: Electron.OpenDialogOptions) =>
		ipcRenderer.invoke('dialog:open', options),

	saveFileDialog: (options: Electron.SaveDialogOptions) =>
		ipcRenderer.invoke('dialog:save', options)
});
