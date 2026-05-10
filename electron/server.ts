import express, { type Request, type Response } from 'express';
import path from 'node:path';

/**
 * create and start the local api server
 */
export async function createServer(port: number, isDev: boolean): Promise<void> {
	const app = express();

	app.use(express.json());

	// api routes---

	app.get('/api/health', (_req: Request, res: Response) => {
		res.json({ status: 'ok', timestamp: Date.now() });
	});

	// static file serving (prod only)

	if (!isDev) {
		const buildPath = path.join(__dirname, '../build');

		app.use(express.static(buildPath)); //serve

		// spa fallback
		app.use((_req: Request, res: Response) => {
			res.sendFile(path.join(buildPath, 'index.html'));
		});
	}

	// listen
	return new Promise((resolve, reject) => {
		const server = app.listen(port, '127.0.0.1', () => {
			console.log(`[MasterDebater] Local server running on http://127.0.0.1:${port}`);
			resolve();
		});

		server.on('error', (err: any) => {
			if (err.code === 'EADDRINUSE') {
				console.error(`[MasterDebater] Port ${port} is already in use.`);
				reject(err);
			} else {
				console.error('[MasterDebater] Server error:', err);
				reject(err);
			}
		});
	});
}
