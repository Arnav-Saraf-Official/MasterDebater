import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	platform: process.platform,

	openFileDialog: (options: Electron.OpenDialogOptions) =>
		ipcRenderer.invoke('dialog:open', options),

	saveFileDialog: (options: Electron.SaveDialogOptions) =>
		ipcRenderer.invoke('dialog:save', options),

	// storage
	setApiKey: (key: string) => ipcRenderer.invoke('secure:set-api-key', key),

	getApiKey: () => ipcRenderer.invoke('secure:get-api-key'),

	deleteApiKey: () => ipcRenderer.invoke('secure:delete-api-key'),

	// ai req
	callAI: (payload: {
		prompt: string;
		system_prompt?: string;
		provider: 'deepseek' | 'groq';
		idempotency_key: string;
	}) => ipcRenderer.invoke('ai:request', payload)
});
