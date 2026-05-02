import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and start the local API server.
 * In production, this also serves the SvelteKit static build.
 * In development, only the API is served (SvelteKit dev server handles the UI).
 */
export async function createServer(port: number): Promise<void> {
	const app = express();
	const isDev = !!(process.env.ELECTRON_DEV);

	// Parse JSON bodies
	app.use(express.json());

	// ─── API Routes ───────────────────────────────────────────────

	// Health check
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

	// ─── Static File Serving (Production Only) ────────────────────

	if (!isDev) {
		const buildPath = path.join(__dirname, '../build');
		// Serve SvelteKit static build
		app.use(express.static(buildPath));

		// SPA fallback — all non-API routes serve index.html
		app.get('*', (_req: Request, res: Response) => {
			res.sendFile(path.join(buildPath, 'index.html'));
		});
	}

	// Start listening
	return new Promise((resolve) => {
		app.listen(port, () => {
			console.log(`[MasterDebater] Local server running on http://localhost:${port}`);
			resolve();
		});
	});
}
