import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';

const WORKER_URL = 'https://manager.masterdebaterapp.workers.dev';

export const _MODELS: Record<string, { provider: string; model_id: string }> = {
	'DeepSeek V4 Pro': {
		provider: 'deepseek',
		model_id: 'deepseek-v4-pro'
	},
	'DeepSeek V4 Fast': {
		provider: 'deepseek',
		model_id: 'deepseek-v4-fast'
	},
	'Llama 3.3 70B': {
		provider: 'groq',
		model_id: 'llama-3.3-70b-versatile'
	}
};

export const GET = async ({ request }) => {
	try {
		const authHeader = request.headers.get('authorization');

		if (!authHeader) {
			return json({ loggedIn: false });
		}

		const accessToken = authHeader.replace('Bearer ', '');

		const userRes = await fetch('https://njvfstduswdwdmyntzow.supabase.co/auth/v1/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				apikey: 'sb_publishable_25apIwJcdMrnMkTqOcZEjg_3NWawQuS'
			}
		});

		if (!userRes.ok) {
			return json({ loggedIn: false });
		}

		const user = await userRes.json();

		return json({
			loggedIn: true,
			user: {
				id: user.id,
				email: user.email
			}
		});
	} catch (e) {
		return json({ loggedIn: false });
	}
};

export const POST = async ({ request }) => {
	try {
		const authHeader = request.headers.get('authorization');

		if (!authHeader) {
			return json({ success: false, error: 'no auth' }, { status: 401 });
		}

		const accessToken = authHeader.replace('Bearer ', '');

		const res = await fetch(`${WORKER_URL}/create-key`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!res.ok) {
			const errText = await res.text();
			return json(
				{ success: false, error: `failed to create api key: ${errText}` },
				{ status: 500 }
			);
		}

		const data = await res.json();

		return json({
			success: true,
			api_key: data.api_key
		});
	} catch (e: any) {
		console.error('[/POST] Unhandled error:', e);
		return json(
			{ success: false, error: `server error: ${e?.message ?? String(e)}` },
			{ status: 500 }
		);
	}
};

async function loadSystemPrompt(filePath: string): Promise<string> {
	try {
		const absolutePath = path.resolve(filePath);
		const content = await readFile(absolutePath, 'utf-8');
		return content;
	} catch (error) {
		console.error('Error reading .md file:', error);
		return '';
	}
}
let systemPromptCache: Promise<string> | null = null;

function getSystemPrompt(): Promise<string> {
	systemPromptCache ??= loadSystemPrompt('static/system/masterCard.md');
	return systemPromptCache;
}

async function fetchFromUrl(url: string): Promise<string> {
	const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
	if (!response.ok) {
		throw new Error(`Failed to fetch from URL: ${response.statusText}`);
	}
	return response.text();
}

export async function _generateCardQuery(
	apiKey: string,
	modelKey: string,
	side: string,
	case_argument: string,
	offcase_argument: string,
	card_argument: string,
	source_type: string,
	evidence_source: string | File,
	citation: string = ''
) {
	const modelConfig = _MODELS[modelKey];
	let evidence: string = '';
	if (!modelConfig) {
		throw new Error(`Model ${modelKey} is not supported.`);
	}
	switch (source_type) {
		case 'text':
			evidence = String(evidence_source);
			break;
		case 'link':
			evidence = await fetchFromUrl(String(evidence_source));
			break;
		case 'file': {
			if (evidence_source instanceof File) {
				const ext = evidence_source.name.split('.').pop()?.toLowerCase();
				if (ext === 'pdf') {
					const pdf = (await import('pdf-parse')) as any;
					const dataBuffer = await evidence_source.arrayBuffer();
					const data = await pdf(Buffer.from(dataBuffer));
					evidence = data.text;
				} else {
					evidence = await evidence_source.text();
				}
			}
			break;
		}
	}
	const payload: any = {
		api_key: apiKey,
		provider: modelConfig.provider,
		model: modelConfig.model_id,
		system_prompt: await getSystemPrompt(),
		prompt: `
		
		Side: ${side}
		Topic: ${case_argument}
		Argument: ${offcase_argument}
		Card Argument: ${card_argument}
		Citation: ${citation}
		Evidence: ${evidence}
		`,
		idempotency_key: crypto.randomUUID()
	};
	console.log('[generateCardQuery] Sending payload to worker:', {
		provider: payload.provider,
		model: payload.model,
		prompt: payload.prompt,
		system_prompt_length: payload.system_prompt.length
	});
	try {
		const res = await fetch(`${WORKER_URL}/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errText = await res.text();
			console.error('[generateCardQuery] Worker error:', res.status, errText);
			throw new Error(`Worker error: ${res.status} ${errText}`);
		}

		const body = await res.text();
		console.log('[generateCardQuery] Worker response (first 500):', body.substring(0, 500));
		try {
			return JSON.parse(body);
		} catch {
			throw new Error(`Invalid JSON from worker: ${body.substring(0, 200)}`);
		}
	} catch (e: any) {
		const cause = e?.cause?.message ?? String(e?.cause ?? '');
		const msg = `${e.message}${cause ? ` (cause: ${cause})` : ''}`;
		console.error('[generateCardQuery] fetch threw:', msg, e?.stack);
		throw new Error(msg);
	}
}
