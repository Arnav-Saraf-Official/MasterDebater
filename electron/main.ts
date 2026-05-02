import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createServer } from './server';

const isDev = !app.isPackaged;
const PORT = 3456;

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
	// Start the local API server
	await createServer(PORT);

	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 375,
		minHeight: 600,
		title: 'MasterDebater',
		backgroundColor: '#FFFBEB',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true
		}
	});

	if (isDev) {
		// Development: load from SvelteKit dev server (HMR)
		await mainWindow.loadURL('http://localhost:5173');
		mainWindow.webContents.openDevTools();
	} else {
		// Production: load from local Express server (serves static build + API)
		await mainWindow.loadURL(`http://localhost:${PORT}`);
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
