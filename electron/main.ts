import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !!process.env.ELECTRON_DEV || !app.isPackaged;
const PORT = 3456;

let mainWindow: BrowserWindow | null = null;

console.log('[MasterDebater] Main process starting...');

// ─── Protocol Registration ───────────────────────────────────────────

if (process.defaultApp) {
	console.log('[MasterDebater] Running in default app mode');
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient('masterdebater', process.execPath, [
			path.resolve(process.argv[1])
		]);
	}
} else {
	console.log('[MasterDebater] Running in packaged mode');
	app.setAsDefaultProtocolClient('masterdebater');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	console.log('[MasterDebater] Failed to get single instance lock, quitting.');
	app.quit();
} else {
	console.log('[MasterDebater] Successfully acquired single instance lock.');
	app.on('second-instance', (event, commandLine) => {
		console.log('[MasterDebater] Received second instance event');
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
		const url = commandLine.pop();
		if (url) handleDeepLink(url);
	});
}

// ─── Deep Link Handling ──────────────────────────────────────────────

function handleDeepLink(url: string) {
	console.log('[MasterDebater] Handling deep link:', url);
	if (!url || !url.startsWith('masterdebater://')) return;

	if (mainWindow) {
		const route = url.replace('masterdebater://', '');
		const targetUrl = isDev ? `http://localhost:5188/${route}` : `http://localhost:${PORT}/${route}`;
		console.log('[MasterDebater] Navigating to target:', targetUrl);
		mainWindow.loadURL(targetUrl).catch((err) => {
			console.error('[MasterDebater] Failed to load deep link URL:', err);
		});
	}
}

async function createWindow(): Promise<void> {
	console.log('[MasterDebater] Creating window...');
	// Start the local API server
	try {
		await createServer(PORT);
		console.log('[MasterDebater] Local server started on port', PORT);
	} catch (err) {
		console.error('[MasterDebater] Failed to start local server:', err);
	}

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
		console.log('[MasterDebater] Loading dev URL: http://localhost:5188');
		mainWindow.loadURL('http://localhost:5188').catch((err) => {
			console.error('[MasterDebater] Failed to load dev URL:', err);
		});
		mainWindow.webContents.openDevTools();
	} else {
		console.log('[MasterDebater] Loading production URL');
		mainWindow.loadURL(`http://localhost:${PORT}`).catch((err) => {
			console.error('[MasterDebater] Failed to load production URL:', err);
		});
	}

	mainWindow.on('closed', () => {
		console.log('[MasterDebater] Window closed');
		mainWindow = null;
	});

	// Check if we were opened with a deep link
	if (process.platform !== 'darwin') {
		const url = process.argv.find((arg) => arg.startsWith('masterdebater://'));
		if (url) {
			console.log('[MasterDebater] Found deep link in argv:', url);
			handleDeepLink(url);
		}
	}
}

app.whenReady().then(() => {
	console.log('[MasterDebater] App ready');
	createWindow();
});

app.on('window-all-closed', () => {
	console.log('[MasterDebater] All windows closed');
	if (process.platform !== 'darwin') app.quit();
});

app.on('open-url', (event, url) => {
	console.log('[MasterDebater] App opened with URL:', url);
	event.preventDefault();
	if (mainWindow) {
		handleDeepLink(url);
	} else {
		app.whenReady().then(() => handleDeepLink(url));
	}
});

app.on('activate', () => {
	console.log('[MasterDebater] App activated');
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
