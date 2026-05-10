import express, { type Request, type Response } from 'express';
import path from 'node:path';

/**
 * create and start the local api server
 */
export async function createServer(port: number): Promise<void> {
	const app = express();
	const isDev = !!process.env.ELECTRON_DEV;

	app.use(express.json());

	// api routes---

	app.get('/api/health', (_req: Request, res: Response) => {
		res.json({ status: 'ok', timestamp: Date.now() });
	});

	// AI API proxy — keeps API keys server-side
	// TODO: Implement AI proxy endpoints for cutting cards, auto flow, etc.
	// Example:
	// app.post('/api/ai/completions', async (req, res) => { ... });
	// app.post('/api/ai/transcribe', async (req, res) => { ... });

	// File I/O — read/write debate files, card exports
	// TODO: Implement file I/O endpoints
	// Example:
	// app.post('/api/files/read', async (req, res) => { ... });
	// app.post('/api/files/write', async (req, res) => { ... });
	// app.post('/api/files/export-cards', async (req, res) => { ... });

	// static file serving (prod only)

	if (!isDev) {
		const buildPath = path.join(__dirname, '../build');

		app.use(express.static(buildPath)); //serve

		// spa fallback
		app.get('*', (_req: Request, res: Response) => {
			res.sendFile(path.join(buildPath, 'index.html'));
		});
	}

	// listen
	return new Promise((resolve) => {
		app.listen(port, () => {
			console.log(`[MasterDebater] Local server running on http://localhost:${port}`);
			resolve();
		});
	});
}
