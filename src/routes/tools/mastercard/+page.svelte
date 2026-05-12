<script lang="ts">
	import {
		Send,
		UploadCloud,
		Link as LinkIcon,
		Type,
		FileText,
		ChevronDown,
		Copy,
		Trash2,
		RefreshCw,
		Download,
		FileDown,
		ClipboardCopy,
		X
	} from '@lucide/svelte';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';

	let helpOpen = $state(false);
	import { supabase } from '$lib/supabase';
	import { browser } from '$app/environment';
	import DOMPurify from 'dompurify';

	const WELCOME =
		'Welcome to MasterCard! Provide your case argument and source material (text, link, or file) and I will cut a structured debate card for you.';

	let messages = $state<
		{ role: string; content: string; canRetry?: boolean; timestamp?: number; modelName?: string }[]
	>([{ role: 'assistant', content: WELCOME }]);
	let activeToast = $state<{ index: number; label: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout>;
	let chatEl = $state<HTMLElement>();
	let openMenu = $state<{ index: number; menu: 'copy' | 'dl' } | null>(null);

	function streamIntoLast(content: string) {
		let i = 0;
		const CHUNK = 5;
		const base = messages[messages.length - 1].content;
		let accumulated = base;
		const last = messages[messages.length - 1];
		const interval = setInterval(() => {
			if (i >= content.length) {
				clearInterval(interval);
				return;
			}
			const end = Math.min(i + CHUNK, content.length);
			accumulated += content.slice(i, end);
			i = end;
			messages[messages.length - 1] = { ...last, content: accumulated };
		}, 24);
	}

	function toggleMenu(index: number, menu: 'copy' | 'dl') {
		openMenu = openMenu?.index === index && openMenu.menu === menu ? null : { index, menu };
	}

	// init from ls
	let side = $state(browser ? (localStorage.getItem('mc_side') ?? 'affirmative') : 'affirmative');
	let model = $state(
		browser ? (localStorage.getItem('mc_model') ?? 'Choose Model') : 'Choose Model'
	);
	let caseArgument = $state(browser ? (localStorage.getItem('mc_caseArg') ?? '') : '');

	$effect(() => {
		localStorage.setItem('mc_side', side);
	});
	$effect(() => {
		localStorage.setItem('mc_model', model);
	});
	let _caseArgTimer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const val = caseArgument;
		clearTimeout(_caseArgTimer);
		_caseArgTimer = setTimeout(() => localStorage.setItem('mc_caseArg', val), 300);
	});
	$effect(() => {
		void (messages.length + (isProcessing ? 1 : 0));
		chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
	});
	let offcaseArgument = $state('');
	let cardArgument = $state('');
	let citation = $state('');

	let inputMode = $state('text'); // 'text' | 'link' | 'file'
	let textContent = $state('');
	let linkContent = $state('');
	let fileContent = $state<File | null>(null);

	let isProcessing = $state(false);
	let fileInputEl = $state<HTMLInputElement>();

	type SubmitPayload = {
		caseArg: string;
		offcaseArg: string;
		cardArg: string;
		citation: string;
		textContent: string;
		linkContent: string;
		fileContent: File | null;
		inputMode: string;
		side: string;
		model: string;
	};
	let lastSubmit = $state<SubmitPayload | null>(null);

	let wordCount = $state(0);
	let charCount = $derived(textContent.length);
	let _wordCountTimer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const text = textContent;
		clearTimeout(_wordCountTimer);
		_wordCountTimer = setTimeout(() => {
			wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
		}, 250);
	});

	// render only for copy/export
	function renderContent(raw: string): string {
		return raw
			.replace(/(\S)\*\*/g, '$1 **')
			.replace(/\*\*(\S)/g, '** $1')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(
				/<f1>(.*?)<\/f1>/gs,
				'<span style="font-size:5pt;vertical-align:baseline;line-height:1">$1</span>'
			)
			.replace(/<f2>(.*?)<\/f2>/gs, '<span style="font-size:11pt">$1</span>')
			.replace(/<f3>(.*?)<\/f3>/gs, '<span style="font-size:11pt">$1</span>')
			.replace(/<f4>(.*?)<\/f4>/gs, '<span style="font-size:11pt">$1</span>')
			.replace(/<f5>(.*?)<\/f5>/gs, '<span style="font-size:11pt">$1</span>')
			.replace(
				/<spk>(.*?)<\/spk>/gs,
				'<span style="background-color:#a8d4f5;color:#000;font-weight:700;text-decoration:underline">$1</span>'
			)
			.replace(
				/<sum>(.*?)<\/sum>/gs,
				'<div style="font-family:Calibri,sans-serif;font-size:13pt;font-weight:700;margin-bottom:6px;color:#111;line-height:1.4">$1</div>'
			)
			.replace(/<cite>(.*?)<\/cite>/gs, (_, inner) => {
				const trimmed = inner
					.trim()
					.replace(/^\|+\s*|\s*\|+$/g, '')
					.trim();
				if (!trimmed) return '';
				const sepIdx = trimmed.indexOf(' | ');
				if (sepIdx !== -1) {
					const short = trimmed.slice(0, sepIdx).trim();
					const full = trimmed.slice(sepIdx + 3).trim();
					if (!short && !full) return '';
					if (!short)
						return `<div style="font-family:'Times New Roman',Times,serif;font-size:6pt;margin-bottom:4px">[${full}]</div>`;
					return `<div style="margin-bottom:4px"><span style="font-family:'Times New Roman',Times,serif;font-size:13pt;font-weight:700;color:#111">${short}</span> <span style="font-family:'Times New Roman',Times,serif;font-size:6pt">[${full}]</span></div>`;
				}
				return `<div style="font-family:'Times New Roman',Times,serif;font-size:13pt;font-weight:700;margin-bottom:4px;color:#111">${trimmed}</div>`;
			});
	}

	// render for in-app display only
	function renderDisplay(raw: string): string {
		return raw
			.replace(/(\S)\*\*/g, '$1 **')
			.replace(/\*\*(\S)/g, '** $1')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/<f1>(.*?)<\/f1>/gs, '<span class="cd-f1">$1</span>')
			.replace(/<f[2-5]>(.*?)<\/f[2-5]>/gs, '<span>$1</span>')
			.replace(/<spk>(.*?)<\/spk>/gs, '<mark class="cd-spk">$1</mark>')
			.replace(/<sum>(.*?)<\/sum>/gs, '<div class="cd-sum">$1</div>')
			.replace(/<cite>(.*?)<\/cite>/gs, (_, inner) => {
				const trimmed = inner
					.trim()
					.replace(/^\|+\s*|\s*\|+$/g, '')
					.trim();
				if (!trimmed) return '';
				const sepIdx = trimmed.indexOf(' | ');
				if (sepIdx !== -1) {
					const short = trimmed.slice(0, sepIdx).trim();
					const full = trimmed.slice(sepIdx + 3).trim();
					if (!short && !full) return '';
					if (!short) return `<div class="cd-cite-long">[${full}]</div>`;
					return `<div class="cd-cite"><span class="cd-cite-short">${short}</span> <span class="cd-cite-long">[${full}]</span></div>`;
				}
				return `<div class="cd-cite-short">${trimmed}</div>`;
			});
	}

	// docx export
	// splits raw content into sgmts
	type Seg = {
		text: string;
		bold?: boolean;
		size?: number;
		highlight?: boolean;
		italic?: boolean;
		cite?: boolean;
		sum?: boolean;
	};

	function parseSegments(raw: string): Seg[] {
		// f1=irrelevant(5px→10half-pt), f2-f5=11px→22half-pt
		const TAG_PROPS: Record<string, Partial<Seg>> = {
			f1: { size: 10 },
			f2: { size: 22 },
			f3: { size: 22 },
			f4: { size: 22 },
			f5: { size: 22 },
			spk: { highlight: true, bold: true },
			sum: { bold: true, sum: true, size: 26 },
			cite: { cite: true }
		};
		const segs: Seg[] = [];

		const re = /<(f[1-5]|spk|sum|cite|b|u|i)>([\s\S]*?)<\/\1>|\*\*([\s\S]*?)\*\*|([^<*]+|[<*])/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(raw)) !== null) {
			if (m[1]) {
				const tag = m[1];
				if (tag === 'cite') {
					const inner = m[2]
						.trim()
						.replace(/^\|+\s*|\s*\|+$/g, '')
						.trim();
					if (!inner) continue;
					const sepIdx = inner.indexOf(' | ');
					if (sepIdx !== -1) {
						const short = inner.slice(0, sepIdx).trim();
						const full = inner.slice(sepIdx + 3).trim();
						if (short) segs.push({ text: short, bold: true, size: 26, cite: true });
						if (short && full) segs.push({ text: ' ', size: 12, cite: true });
						if (full) segs.push({ text: `[${full}]`, size: 12, cite: true });
					} else {
						segs.push({ text: inner, bold: true, size: 26, cite: true });
					}
					continue;
				}
				const props: Partial<Seg> =
					tag === 'b'
						? { bold: true }
						: tag === 'u'
							? {}
							: tag === 'i'
								? { italic: true }
								: (TAG_PROPS[tag] ?? {});
				segs.push({ text: m[2], ...props });
			} else if (m[3] !== undefined) {
				segs.push({ text: m[3], bold: true });
			} else if (m[4]) {
				segs.push({ text: m[4] });
			}
		}
		return segs;
	}

	async function downloadDocx(content: string, index: number) {
		const { Document, Packer, Paragraph, TextRun, BorderStyle } = await import('docx');
		const segs = parseSegments(content);

		// group consecutive segs
		type DocxParagraph = InstanceType<typeof Paragraph>;
		const paragraphs: DocxParagraph[] = [];
		let currentRuns: InstanceType<typeof TextRun>[] = [];

		function flushParagraph(isSumBlock = false) {
			if (!currentRuns.length) return;
			paragraphs.push(
				new Paragraph({
					children: currentRuns,
					...(isSumBlock
						? {
								border: { left: { style: BorderStyle.THICK, size: 6, color: 'D97706', space: 6 } },
								indent: { left: 180 }
							}
						: {})
				})
			);
			currentRuns = [];
		}

		for (const seg of segs) {
			// split seg text
			const lines = seg.text.split('\n');
			for (let li = 0; li < lines.length; li++) {
				const txt = lines[li];
				if (txt) {
					currentRuns.push(
						new TextRun({
							text: txt,
							bold: seg.bold ?? false,
							italics: seg.italic ?? seg.cite ?? false,
							size: seg.size ?? 22,
							font: seg.sum ? 'Calibri' : 'Times New Roman',
							...(seg.highlight ? { highlight: 'cyan' } : {}),
							...(seg.cite ? { color: '555555' } : {})
						})
					);
				}
				if (li < lines.length - 1) flushParagraph(seg.sum);
			}
		}
		flushParagraph();

		const doc = new Document({ sections: [{ children: paragraphs }] });
		const blob = await Packer.toBlob(doc);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mastercard-${Date.now()}.docx`;
		a.click();
		URL.revokeObjectURL(url);
		triggerToast(index, 'Downloaded as .docx!');
	}

	async function copyFormatted(content: string, index: number) {
		const html = renderContent(content);
		// wrap in styled contain
		const wrapped = `<meta charset="utf-8"><div style="font-family:'Times New Roman',Times,serif;font-size:11pt;line-height:1.55">${html}</div>`;
		try {
			await navigator.clipboard.write([
				new ClipboardItem({
					'text/html': new Blob([wrapped], { type: 'text/html' }),
					'text/plain': new Blob([content], { type: 'text/plain' })
				})
			]);
		} catch {
			//plaintext
			await navigator.clipboard.writeText(content);
		}
		triggerToast(index, 'Copied with formatting!');
	}

	function triggerToast(index: number, label: string) {
		clearTimeout(toastTimer);
		activeToast = { index, label };
		toastTimer = setTimeout(() => (activeToast = null), 2000);
	}

	function clearChat() {
		messages = [{ role: 'assistant', content: WELCOME }];
	}

	async function copyMessage(content: string, index: number) {
		await navigator.clipboard.writeText(content);
		triggerToast(index, 'Copied as plain text!');
	}

	function downloadCard(content: string, index: number) {
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mastercard-${Date.now()}.txt`;
		a.click();
		URL.revokeObjectURL(url);
		triggerToast(index, 'Downloaded as .txt!');
	}

	function relativeTime(ts: number): string {
		const diff = Math.floor((Date.now() - ts) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			handleSubmit(new Event('submit'));
		}
	}

	const DEV_TEST_CASES = [
		{
			label: 'UBI text',
			side: 'affirmative',
			model: 'Llama 3.3 70B',
			caseArgument: 'Universal Basic Income',
			offcaseArgument: 'Welfare Reform Disad',
			cardArgument: 'UBI reduces poverty',
			citation:
				'Johnson 23 | Emily Johnson, 2023, "Unconditional Cash Transfers and Poverty Reduction," Stanford Social Innovation Review',
			inputMode: 'text',
			textContent:
				'The debate over unconditional cash transfers has intensified in recent years as policymakers search for alternatives to means-tested welfare programs. Proponents argue that direct cash grants empower recipients to allocate resources according to their own needs, while critics contend that such programs disincentivize labor force participation. A number of pilot programs have been conducted across the United States, Kenya, Finland, and Canada to evaluate these competing claims empirically. In the most comprehensive domestic study to date, researchers at Stanford University tracked 1,200 low-income households over an eighteen-month period. Participants received unconditional cash transfers of $500 per month with no strings attached and no work requirements. The results were striking: poverty rates fell by 40% among recipients compared to a matched control group receiving traditional welfare benefits. Participants were also measurably more likely to seek employment and pursue educational opportunities, contradicting the disincentive hypothesis. The authors note that the cash transfers allowed families to cover basic needs reliably, reducing the cognitive burden of scarcity that previous research has shown to impair decision-making. Critics of the study point to its limited geographic scope and relatively short timeframe as reasons for caution before scaling the intervention nationally.'
		},
		{
			label: 'Climate neg text',
			side: 'negative',
			model: 'DeepSeek V4 Pro',
			caseArgument: 'Green New Deal',
			offcaseArgument: 'Economy Disad',
			cardArgument: 'economic costs outweigh climate benefits',
			citation:
				'Morris 22 | David Morris, 2022, "The Price of Green Ambition," Brookings Institution Press',
			inputMode: 'text',
			textContent:
				"Climate policy has become one of the central fault lines in contemporary American political economy. Advocates of aggressive federal intervention point to the mounting costs of extreme weather events and the long-run risks of unchecked warming. Skeptics of expansive legislation, however, argue that the economic disruption of rapid decarbonization could itself impose severe welfare losses, particularly on working-class communities dependent on fossil fuel industries. The Congressional Budget Office released an assessment in 2022 examining the macroeconomic implications of the Green New Deal framework. The agency estimated total expenditures of between $51 trillion and $93 trillion over ten years — more than double the entirety of current federal spending across all programs and departments combined. The CBO further noted that projected emissions reductions under the proposal were highly uncertain, with modeling ranges spanning from modest reductions to outcomes indistinguishable from a business-as-usual trajectory depending on implementation choices and private sector responses. By contrast, economists across the ideological spectrum have consistently found that a revenue-neutral carbon pricing mechanism could achieve equivalent or superior emissions outcomes at a fraction of the cost, on the order of $300 billion to $1 trillion over the same period. The distributional consequences of the Green New Deal's spending provisions also remain contested, with some analysts arguing that the bill's labor and procurement requirements would primarily benefit unionized workers in high-cost states rather than the most economically vulnerable communities."
		}
	];

	async function runDevTest(tc: (typeof DEV_TEST_CASES)[0]) {
		side = tc.side;
		model = tc.model;
		caseArgument = tc.caseArgument;
		offcaseArgument = tc.offcaseArgument;
		cardArgument = tc.cardArgument;
		citation = tc.citation;
		inputMode = tc.inputMode;
		textContent = tc.textContent;

		await Promise.resolve();
		handleSubmit(new Event('submit'));
	}

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			fileContent = target.files[0];
		}
	}

	async function getApiKey(accessToken: string): Promise<string | null> {
		let apiKey = localStorage.getItem('masterdebater_api_key');
		if (!apiKey) {
			const keyRes = await fetch('/', {
				method: 'POST',
				headers: { Authorization: `Bearer ${accessToken}` }
			});
			if (keyRes.ok) {
				const d = await keyRes.json();
				apiKey = d.api_key ?? null;
				if (apiKey) localStorage.setItem('masterdebater_api_key', apiKey);
			} else {
				const errData = await keyRes.json().catch(() => ({ error: 'unknown error' }));
				console.error('[MasterCard] Key fetch failed:', keyRes.status, errData.error);
			}
		}
		return apiKey;
	}

	function buildFormData(p: SubmitPayload, apiKey: string): FormData {
		const fd = new FormData();
		fd.append('api_key', apiKey);
		fd.append('model', p.model);
		fd.append('side', p.side);
		fd.append('caseArgument', p.caseArg);
		fd.append('offcaseArgument', p.offcaseArg);
		fd.append('cardArgument', p.cardArg);
		fd.append('citation', p.citation);
		fd.append('inputMode', p.inputMode);
		if (p.inputMode === 'text') fd.append('textContent', p.textContent);
		if (p.inputMode === 'link') fd.append('linkContent', p.linkContent);
		if (p.inputMode === 'file' && p.fileContent) fd.append('fileContent', p.fileContent);
		return fd;
	}

	// stream=true: seeds an empty bubble then animates content in.
	// stream=false: appends full content at once (retry — no re-animation).
	async function runCardRequest(payload: SubmitPayload, stream: boolean): Promise<void> {
		isProcessing = true;
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session) {
				messages = [...messages, { role: 'assistant', content: 'You must be logged in.' }];
				return;
			}

			const apiKey = await getApiKey(session.access_token);
			if (!apiKey) {
				messages = [
					...messages,
					{
						role: 'assistant',
						content: 'Failed to obtain an API key. Please log out and log back in.',
						canRetry: true
					}
				];
				return;
			}

			const res = await fetch('/tools/mastercard', {
				method: 'POST',
				headers: { Authorization: `Bearer ${session.access_token}` },
				body: buildFormData(payload, apiKey)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to generate card');
			}

			const result = await res.json();
			const content = result.choices?.[0]?.message?.content || 'No response from AI.';

			if (stream) {
				messages = [
					...messages,
					{ role: 'assistant', content: '', timestamp: Date.now(), modelName: payload.model }
				];
				isProcessing = false;
				streamIntoLast(content);
			} else {
				messages = [
					...messages,
					{ role: 'assistant', content, timestamp: Date.now(), modelName: payload.model }
				];
			}
		} catch (e: unknown) {
			messages = [
				...messages,
				{ role: 'assistant', content: `Error: ${(e as Error).message}`, canRetry: true }
			];
		} finally {
			isProcessing = false;
		}
	}

	async function retrySubmit() {
		if (!lastSubmit) return;
		messages = messages.slice(0, -1);
		await runCardRequest(lastSubmit, false);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!caseArgument) return;
		if (inputMode === 'text' && !textContent) return;
		if (inputMode === 'link' && !linkContent) return;
		if (inputMode === 'file' && !fileContent) return;

		let userMessage = `[${side === 'affirmative' ? 'Affirmative' : 'Negative'}] Case: ${caseArgument}\n`;
		if (offcaseArgument) userMessage += `Offcase: ${offcaseArgument}\n`;
		if (cardArgument) userMessage += `Card: ${cardArgument}\n`;
		if (inputMode === 'text') userMessage += `Source (Text): ${textContent.substring(0, 150)}...`;
		else if (inputMode === 'link') userMessage += `Source (Link): ${linkContent}`;
		else if (inputMode === 'file' && fileContent)
			userMessage += `Source (File): ${fileContent.name}`;
		messages = [...messages, { role: 'user', content: userMessage, timestamp: Date.now() }];

		const payload: SubmitPayload = {
			caseArg: caseArgument,
			offcaseArg: offcaseArgument,
			cardArg: cardArgument,
			citation,
			textContent,
			linkContent,
			fileContent,
			inputMode,
			side,
			model
		};
		lastSubmit = payload;

		cardArgument = '';
		textContent = '';
		linkContent = '';
		fileContent = null;
		if (fileInputEl) fileInputEl.value = '';

		await runCardRequest(payload, true);
	}
</script>

<svelte:head>
	<title>MasterCard Chat | MasterDebater</title>
</svelte:head>

<div class="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-[95vw] flex-col px-6 pt-32 pb-12">
	<!-- Chat Header -->
	<div
		class="stagger-1 mb-8 flex animate-fade-in-up flex-col items-center justify-center text-center"
	>
		<div
			class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
		>
			<FileText size={32} />
		</div>
		<h1 class="font-heading text-4xl font-medium text-foreground">MasterCard AI</h1>
		<p class="mt-2 max-w-lg text-muted-foreground">
			Automatically cut evidence cards from any source. Select your side, provide your arguments,
			and choose one source type.
		</p>
	</div>
	<div class="flex gap-4">
		<span class="w-full">
			<div
				bind:this={chatEl}
				class="stagger-2 mb-6 flex min-h-[400px] flex-1 animate-fade-in-up flex-col space-y-4 overflow-y-auto rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
			>
				<!-- clear chat button -->
				<div class="flex justify-between">
					<button
						type="button"
						onclick={() => (helpOpen = true)}
						class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-background hover:text-foreground"
					>
						<CircleQuestionMark size={13} /> Guide
					</button>
					<button
						type="button"
						onclick={clearChat}
						class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-background hover:text-foreground"
					>
						<Trash2 size={13} /> Clear chat
					</button>
				</div>

				{#each messages as message, i (message.timestamp ?? i)}
					<div class="flex w-full {message.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div
							class="group max-w-[85%] rounded-2xl p-4 shadow-sm {message.role === 'user'
								? 'rounded-tr-sm bg-primary text-on-primary'
								: 'rounded-tl-sm bg-background text-foreground ring-1 ring-border'}"
						>
							{#if message.role === 'assistant'}
								<div class="mb-2 flex items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<FileText size={14} class="text-primary" />
										<span class="text-xs font-semibold tracking-wider text-primary uppercase"
											>MasterCard</span
										>
									</div>
									<!-- copy as / download as dropdowns -->
									{#if message.content && message.content !== WELCOME && !message.canRetry}
										<div class="ml-2 flex items-center gap-1">
											<!-- copy as -->
											<div class="relative">
												<button
													type="button"
													onclick={() => toggleMenu(i, 'copy')}
													class="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-all select-none hover:bg-card hover:text-foreground active:scale-95"
												>
													<Copy size={12} /><span>Copy as</span>
												</button>
												{#if openMenu?.index === i && openMenu.menu === 'copy'}
													<div
														class="absolute top-full right-0 z-20 mt-1 flex min-w-[11rem] flex-col overflow-hidden rounded-lg bg-card py-1 shadow-lg ring-1 ring-border"
													>
														<button
															type="button"
															onclick={() => {
																copyMessage(message.content, i);
																openMenu = null;
															}}
															class="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground transition-all hover:bg-background active:scale-95"
														>
															<Copy size={12} class="text-muted-foreground" /> Plain text
														</button>
														<button
															type="button"
															onclick={() => {
																copyFormatted(message.content, i);
																openMenu = null;
															}}
															class="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground transition-all hover:bg-background active:scale-95"
														>
															<ClipboardCopy size={12} class="text-muted-foreground" /> With formatting
														</button>
													</div>
												{/if}
											</div>
											<!-- download as -->
											<div class="relative">
												<button
													type="button"
													onclick={() => toggleMenu(i, 'dl')}
													class="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-all select-none hover:bg-card hover:text-foreground active:scale-95"
												>
													<Download size={12} /><span>Download as</span>
												</button>
												{#if openMenu?.index === i && openMenu.menu === 'dl'}
													<div
														class="absolute top-full right-0 z-20 mt-1 flex min-w-[11rem] flex-col overflow-hidden rounded-lg bg-card py-1 shadow-lg ring-1 ring-border"
													>
														<button
															type="button"
															onclick={() => {
																downloadCard(message.content, i);
																openMenu = null;
															}}
															class="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground transition-all hover:bg-background active:scale-95"
														>
															<FileText size={12} class="text-muted-foreground" /> .txt
														</button>
														<button
															type="button"
															onclick={() => {
																downloadDocx(message.content, i);
																openMenu = null;
															}}
															class="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground transition-all hover:bg-background active:scale-95"
														>
															<FileDown size={12} class="text-muted-foreground" /> .docx
														</button>
													</div>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/if}
							<div
								class={message.role === 'user'
									? 'text-sm leading-relaxed whitespace-pre-wrap text-on-primary/90'
									: 'card-display text-foreground'}
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html DOMPurify.sanitize(renderDisplay(message.content), {
									ALLOWED_TAGS: ['strong', 'span', 'mark', 'div', 'br'],
									ALLOWED_ATTR: ['class', 'style']
								})}
							</div>
							{#if message.canRetry}
								<button
									type="button"
									onclick={retrySubmit}
									disabled={isProcessing}
									class="mt-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/30 transition-all hover:bg-primary/10 disabled:opacity-50"
								>
									<RefreshCw size={12} /> Try again
								</button>
							{/if}
							{#if message.modelName || message.timestamp}
								<div
									class="mt-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100"
								>
									<span class="text-[10px] text-muted-foreground/50">{message.modelName ?? ''}</span
									>
									<span class="text-[10px] text-muted-foreground/40"
										>{message.timestamp ? relativeTime(message.timestamp) : ''}</span
									>
								</div>
							{/if}
						</div>
					</div>
				{/each}
				{#if isProcessing}
					<div class="flex w-full animate-fade-in justify-start">
						<div
							class="max-w-[85%] rounded-2xl rounded-tl-sm bg-background p-4 text-foreground ring-1 ring-border"
						>
							<div class="mb-2 flex items-center gap-2">
								<FileText size={14} class="text-primary" />
								<span class="text-xs font-semibold tracking-wider text-primary uppercase"
									>MasterCard AI</span
								>
							</div>
							<div class="mt-2 flex flex-col gap-2">
								<div class="skeleton h-3 w-full rounded"></div>
								<div class="skeleton h-3 w-4/5 rounded"></div>
								<div class="skeleton h-3 w-3/5 rounded"></div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div
				class="stagger-3 animate-fade-in-up rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
			>
				<form onsubmit={handleSubmit} class="flex flex-col space-y-4">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
						<div class="relative md:col-span-3">
							<select
								bind:value={model}
								class="press-feedback w-full appearance-none rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
							>
								<option disabled selected>Choose Model</option>
								<option value="DeepSeek V4 Pro">DeepSeek V4 Pro</option>
								<option value="DeepSeek V4 Fast">DeepSeek V4 Fast</option>
								<option value="Llama 3.3 70B">Llama 3.3 70B</option>
							</select>
							<ChevronDown
								size={16}
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
						<div class="relative md:col-span-2">
							<select
								bind:value={side}
								class="press-feedback w-full appearance-none rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
							>
								<option value="affirmative">Affirmative</option>
								<option value="negative">Negative</option>
							</select>
							<ChevronDown
								size={16}
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
						<div class="md:col-span-7">
							<input
								type="text"
								bind:value={caseArgument}
								placeholder="Case Argument (Required, short response)"
								required
								class="press-feedback w-full rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
						<div class="md:col-span-6">
							<input
								type="text"
								bind:value={offcaseArgument}
								placeholder="Offcase Argument (Optional, short response)"
								class="press-feedback w-full rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
							/>
						</div>
						<div class="md:col-span-6">
							<input
								type="text"
								bind:value={cardArgument}
								placeholder="Card Argument (Optional, short response)"
								class="press-feedback w-full rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<input
							type="text"
							bind:value={citation}
							placeholder="Citation (Optional — e.g. Smith 23 | John Smith, 2023, Title, Publisher)"
							class="press-feedback w-full rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
						/>
					</div>

					<div class="flex flex-col space-y-2 rounded-lg bg-background p-4 ring-1 ring-border">
						<div class="flex space-x-2 border-b border-border pb-3">
							<button
								type="button"
								onclick={() => (inputMode = 'text')}
								class="press-feedback flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all {inputMode ===
								'text'
									? 'bg-card text-foreground shadow-sm ring-1 ring-border'
									: 'text-muted-foreground hover:bg-card hover:text-foreground hover:ring-1 hover:ring-border'}"
								><Type size={16} /> Text Input</button
							>
							<button
								type="button"
								onclick={() => (inputMode = 'link')}
								class="press-feedback flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all {inputMode ===
								'link'
									? 'bg-card text-foreground shadow-sm ring-1 ring-border'
									: 'text-muted-foreground hover:bg-card hover:text-foreground hover:ring-1 hover:ring-border'}"
								><LinkIcon size={16} /> Link</button
							>
							<button
								type="button"
								onclick={() => (inputMode = 'file')}
								class="press-feedback flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all {inputMode ===
								'file'
									? 'bg-card text-foreground shadow-sm ring-1 ring-border'
									: 'text-muted-foreground hover:bg-card hover:text-foreground hover:ring-1 hover:ring-border'}"
								><UploadCloud size={16} /> File Upload</button
							>
						</div>

						<div class="pt-3">
							{#if inputMode === 'text'}
								<textarea
									bind:value={textContent}
									onkeydown={handleKeydown}
									required
									rows="4"
									placeholder="Paste your long response source text here..."
									class="w-full resize-y rounded-lg bg-card px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30 focus:outline-none"
								></textarea>
								<!-- char/word count -->
								{#if charCount > 0}
									<p class="mt-1 text-right text-xs text-muted-foreground/60">
										{wordCount} words · {charCount} chars
									</p>
								{/if}
							{:else if inputMode === 'link'}
								<input
									type="url"
									bind:value={linkContent}
									required
									placeholder="https://example.com/article"
									class="w-full rounded-lg bg-card px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30 focus:outline-none"
								/>
							{:else if inputMode === 'file'}
								<div class="flex w-full items-center justify-center">
									<label
										class="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card transition-all hover:border-primary/40 hover:bg-primary/5"
									>
										<div class="flex flex-col items-center justify-center pt-5 pb-6">
											<UploadCloud class="mb-2 h-8 w-8 text-muted-foreground" />
											<p class="text-sm font-medium text-foreground">
												Click to upload or drag and drop
											</p>
											<p class="mt-1 text-xs text-muted-foreground">.pdf, .txt, .html, .md</p>
											{#if fileContent}
												<p class="mt-3 text-sm font-semibold text-primary">{fileContent.name}</p>
											{/if}
										</div>
										<input
											bind:this={fileInputEl}
											onchange={handleFileChange}
											type="file"
											class="hidden"
											accept=".pdf,.txt,.html,.md"
											required
										/>
									</label>
								</div>
							{/if}
						</div>
					</div>

					<!-- submit Row -->
					<div class="flex items-center justify-between pt-2">
						<span class="text-xs text-muted-foreground"
							>Select one source format above. Only the active tab will be submitted.</span
						>
						<div class="flex flex-col items-end gap-1">
							<button
								type="submit"
								disabled={isProcessing}
								class="press-feedback flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-on-primary shadow-md transition-all hover:bg-amber-warm-light hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
							>
								<Send size={16} />
								{isProcessing ? 'Processing...' : 'Generate Card'}
							</button>
							<!-- cmd+enter hint -->
							<span class="text-[11px] text-muted-foreground/50">⌘↵ to submit</span>
						</div>
					</div>
				</form>
			</div>
		</span>
	</div>

	{#if helpOpen}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
			role="presentation"
			onclick={() => (helpOpen = false)}
		>
			<div
				class="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border"
				role="dialog"
				aria-modal="true"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onclick={() => (helpOpen = false)}
					class="absolute top-3 right-3 rounded p-1 text-muted-foreground hover:text-foreground"
					><X size={16} /></button
				>
				<h2 class="mb-3 text-base font-semibold text-foreground">MasterCard Guide</h2>
				<div class="flex flex-col gap-2">
					<p class="text-sm text-muted-foreground">1. Select your side (Affirmative or Negative)</p>
					<p class="text-sm text-muted-foreground">
						2. Provide your case argument — the main position this card supports.
					</p>
					<p class="text-sm text-muted-foreground">
						3. Provide an offcase argument (Optional) — for disadvantages, counterplans, or
						critiques.
					</p>
					<p class="text-sm text-muted-foreground">4. Provide your card argument (Optional)</p>
					<p class="text-sm text-muted-foreground">
						5. Select one source format (Text, Link, or File)
					</p>
					<p class="text-sm text-muted-foreground">6. Click "Generate Card" to create your card</p>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if activeToast}
	<div
		class="toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg"
	>
		{activeToast.label}
	</div>
{/if}

{#if import.meta.env.DEV}
	<div class="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
		{#each DEV_TEST_CASES as tc (tc.label)}
				<button
					onclick={() => runDevTest(tc)}
					disabled={isProcessing}
					class="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black shadow-lg hover:bg-yellow-300 disabled:opacity-50"
				>
					⚡ {tc.label}
				</button>
			{/each}
	</div>
{/if}

<style>
	:global(.card-body) {
		font-family: 'Times New Roman', Times, serif;
		font-size: 11px;
		line-height: 1.55;
		word-spacing: 0.02em;
	}
	:global(.card-body u) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	:global(.card-body b),
	:global(.card-body strong) {
		font-weight: 700;
	}

	:global(.card-display) {
		font-size: 0.875rem;
		line-height: 1.65;
	}
	:global(.card-display u) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	:global(.card-display b),
	:global(.card-display strong) {
		font-weight: 700;
	}
	:global(.cd-f1) {
		font-size: 0.6em;
		vertical-align: baseline;
		line-height: 1;
	}
	:global(.cd-spk) {
		background: #a8d4f5;
		color: inherit;
		border-radius: 2px;
		padding: 0 2px;
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	:global(.cd-sum) {
		font-family: Calibri, sans-serif;
		font-size: 13pt;
		font-weight: 700;
		margin-bottom: 6px;
		line-height: 1.4;
	}
	:global(.cd-cite) {
		margin-bottom: 4px;
	}
	:global(.cd-cite-short) {
		font-size: 13pt;
		font-weight: 700;
	}
	:global(.cd-cite-long) {
		font-size: 6pt;
	}

	@keyframes shimmer {
		0% {
			background-position: -400% 0;
		}
		100% {
			background-position: 400% 0;
		}
	}
	.skeleton {
		background: linear-gradient(
			90deg,
			oklch(0.92 0 0 / 0.4) 25%,
			oklch(0.85 0 0 / 0.6) 50%,
			oklch(0.92 0 0 / 0.4) 75%
		);
		background-size: 400% 100%;
		animation: shimmer 1.6s ease-in-out infinite;
	}
	:global(.dark) .skeleton {
		background: linear-gradient(
			90deg,
			oklch(0.3 0 0 / 0.4) 25%,
			oklch(0.4 0 0 / 0.6) 50%,
			oklch(0.3 0 0 / 0.4) 75%
		);
		background-size: 400% 100%;
	}
	@keyframes toast-in-out {
		0% {
			opacity: 0;
			transform: translateX(-50%) translateY(8px);
		}
		15% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		75% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateX(-50%) translateY(8px);
		}
	}
	.toast {
		animation: toast-in-out 2s ease forwards;
	}
</style>
