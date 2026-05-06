import { json } from '@sveltejs/kit';
import { _generateCardQuery } from '../../+server';

const WORKER_URL = 'https://manager.masterdebaterapp.workers.dev';

export const POST = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		return json({ error: 'No authorization header provided' }, { status: 401 });
	}

	const accessToken = authHeader.replace('Bearer ', '');

	const formData = await request.formData();
	const api_key = formData.get('api_key') as string;
	if (!api_key) {
		return json({ error: 'No API key provided. Please log out and log back in.' }, { status: 401 });
	}
	const model = formData.get('model') as string;
	const side = formData.get('side') as string;
	const caseArgument = formData.get('caseArgument') as string;
	const offcaseArgument = formData.get('offcaseArgument') as string;
	const cardArgument = formData.get('cardArgument') as string;
	const inputMode = formData.get('inputMode') as string;

	let evidenceSource: string | File = '';
	if (inputMode === 'text') {
		evidenceSource = formData.get('textContent') as string;
	} else if (inputMode === 'link') {
		evidenceSource = formData.get('linkContent') as string;
	} else if (inputMode === 'file') {
		evidenceSource = formData.get('fileContent') as File;
	}

	console.log('[MasterCard POST] Received request:', {
		model,
		side,
		caseArgument,
		offcaseArgument,
		cardArgument,
		inputMode
	});

	try {
		const result = await _generateCardQuery(
			api_key,
			model,
			side,
			caseArgument,
			offcaseArgument || '',
			cardArgument || '',
			inputMode,
			evidenceSource
		);
		return json(result);
	} catch (e: any) {
		console.error('[mastercard/POST] Error:', e?.message, e?.stack);
		return json({ error: e.message }, { status: 500 });
	}
};
