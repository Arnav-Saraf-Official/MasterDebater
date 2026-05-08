<script lang="ts">
	import {
		Send,
		UploadCloud,
		Link as LinkIcon,
		Type,
		FileText,
		ChevronDown,
		Copy,
		Check,
		Trash2
	} from '@lucide/svelte';
	import { supabase } from '$lib/supabase';

	const WELCOME =
		'Welcome to MasterCard! Provide your case argument and source material (text, link, or file) and I will cut a structured debate card for you.';

	let messages = $state([{ role: 'assistant', content: WELCOME }]);
	let copiedIndex = $state<number | null>(null);

	let side = $state('affirmative');
	let model = $state('Choose Model');
	let caseArgument = $state('');
	let offcaseArgument = $state('');
	let cardArgument = $state('');

	let inputMode = $state('text'); // 'text' | 'link' | 'file'
	let textContent = $state('');
	let linkContent = $state('');
	let fileContent = $state<File | null>(null);

	let isProcessing = $state(false);
	let fileInputEl = $state<HTMLInputElement>();

	let wordCount = $derived(textContent.trim() ? textContent.trim().split(/\s+/).length : 0);
	let charCount = $derived(textContent.length);

	function clearChat() {
		messages = [{ role: 'assistant', content: WELCOME }];
	}

	async function copyMessage(content: string, index: number) {
		await navigator.clipboard.writeText(content);
		copiedIndex = index;
		setTimeout(() => (copiedIndex = null), 1500);
	}

	// progressively reveal idk if ts will work with the worker
	function streamIntoLast(fullText: string) {
		let i = 0;
		const tick = () => {
			if (i >= fullText.length) return;
			i = Math.min(i + 8, fullText.length);
			messages[messages.length - 1] = { role: 'assistant', content: fullText.slice(0, i) };
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
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
			inputMode: 'text',
			textContent:
				'A 2023 Stanford study found unconditional cash transfers of $500/month reduced poverty rates by 40% among recipients over 18 months, with participants more likely to seek employment and education compared to control groups receiving traditional welfare benefits.'
		},
		{
			label: 'Climate neg text',
			side: 'negative',
			model: 'DeepSeek V4 Pro',
			caseArgument: 'Green New Deal',
			offcaseArgument: '',
			cardArgument: 'economic costs outweigh',
			inputMode: 'text',
			textContent:
				'The Congressional Budget Office estimates the Green New Deal would cost between $51 and $93 trillion over ten years, representing more than double current federal spending, with uncertain emissions reductions that could be achieved at far lower cost through carbon pricing mechanisms.'
		}
	];

	async function runDevTest(tc: (typeof DEV_TEST_CASES)[0]) {
		side = tc.side;
		model = tc.model;
		caseArgument = tc.caseArgument;
		offcaseArgument = tc.offcaseArgument;
		cardArgument = tc.cardArgument;
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
		else if (inputMode === 'file' && fileContent) userMessage += `Source (File): ${fileContent.name}`;

		messages = [...messages, { role: 'user', content: userMessage }];

		// snapshot values before reset
		const submitCaseArg = caseArgument;
		const submitOffcaseArg = offcaseArgument;
		const submitCardArg = cardArgument;
		const submitTextContent = textContent;
		const submitLinkContent = linkContent;
		const submitFileContent = fileContent;

		caseArgument = '';
		offcaseArgument = '';
		cardArgument = '';
		textContent = '';
		linkContent = '';
		fileContent = null;
		if (fileInputEl) fileInputEl.value = '';

		isProcessing = true;

		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (!session) {
			messages = [...messages, { role: 'assistant', content: 'You must be logged in to generate cards.' }];
			isProcessing = false;
			return;
		}

		let apiKey = localStorage.getItem('masterdebater_api_key');
		if (!apiKey) {
			const keyRes = await fetch('/', {
				method: 'POST',
				headers: { Authorization: `Bearer ${session.access_token}` }
			});
			if (keyRes.ok) {
				const keyData = await keyRes.json();
				apiKey = keyData.api_key;
				if (apiKey) localStorage.setItem('masterdebater_api_key', apiKey);
			} else {
				const errData = await keyRes.json().catch(() => ({ error: 'unknown error' }));
				console.error('[MasterCard] Key fetch failed:', keyRes.status, errData.error);
			}
		}

		if (!apiKey) {
			messages = [...messages, { role: 'assistant', content: 'Failed to obtain an API key. Please log out and log back in.' }];
			isProcessing = false;
			return;
		}

		const formData = new FormData();
		formData.append('api_key', apiKey);
		formData.append('model', model);
		formData.append('side', side);
		formData.append('caseArgument', submitCaseArg);
		formData.append('offcaseArgument', submitOffcaseArg);
		formData.append('cardArgument', submitCardArg);
		formData.append('inputMode', inputMode);
		if (inputMode === 'text') formData.append('textContent', submitTextContent);
		if (inputMode === 'link') formData.append('linkContent', submitLinkContent);
		if (inputMode === 'file' && submitFileContent) formData.append('fileContent', submitFileContent);

		try {
			const res = await fetch('/tools/mastercard', {
				method: 'POST',
				headers: { Authorization: `Bearer ${session.access_token}` },
				body: formData
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to generate card');
			}

			const result = await res.json();
			const content = result.choices?.[0]?.message?.content || 'No response from AI.';

			// seed empty message then stream characters in
			messages = [...messages, { role: 'assistant', content: '' }];
			isProcessing = false;
			streamIntoLast(content);
			return;
		} catch (e: any) {
			messages = [...messages, { role: 'assistant', content: `Error: ${e.message}` }];
		} finally {
			isProcessing = false;
		}
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
		<span class="w-[100%]">
			<div
				class="stagger-2 mb-6 flex min-h-[400px] flex-1 animate-fade-in-up flex-col space-y-4 overflow-y-auto rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
			>
				<!-- clear chat button -->
				<div class="flex justify-end">
					<button
						type="button"
						onclick={clearChat}
						class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-background hover:text-foreground"
					>
						<Trash2 size={13} /> Clear chat
					</button>
				</div>

				{#each messages as message, i}
					<div class="flex w-full {message.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-[85%] rounded-2xl p-4 shadow-sm {message.role === 'user'
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
									<!-- copy button -->
									<button
										type="button"
										onclick={() => copyMessage(message.content, i)}
										class="ml-2 rounded p-1 text-muted-foreground transition-all hover:bg-card hover:text-foreground"
										title="Copy to clipboard"
									>
										{#if copiedIndex === i}
											<Check size={13} class="text-primary" />
										{:else}
											<Copy size={13} />
										{/if}
									</button>
								</div>
							{/if}
							<div
								class="text-sm leading-relaxed whitespace-pre-wrap {message.role === 'user'
									? 'text-on-primary/90'
									: 'text-foreground'}"
							>
								{@html message.content
									.replace(/(\S)\*\*/g, '$1 **')
									.replace(/\*\*(\S)/g, '** $1')
									.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')}
							</div>
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
							<div class="mt-2 flex gap-1.5">
								<div class="h-2 w-2 animate-bounce rounded-full bg-primary/50"></div>
								<div
									class="h-2 w-2 animate-bounce rounded-full bg-primary/50"
									style="animation-delay: 0.15s"
								></div>
								<div
									class="h-2 w-2 animate-bounce rounded-full bg-primary/50"
									style="animation-delay: 0.3s"
								></div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div
				class="stagger-3 animate-fade-in-up rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
			>
				<form onsubmit={handleSubmit} class="flex flex-col space-y-4">
					<!-- Row 1: Model, Side, Case Arg -->
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

					<!-- Row 2: Offcase Arg, Card Arg -->
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

					<!-- Row 3: Source Input Tabs -->
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

					<!-- Submit Row -->
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
		<div
			class="stagger-3 max-w-[20vw] animate-fade-in-up rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
		>
			<h1 class="text-2xl">MasterCard Guide</h1>
			<hr class="my-2 border-border" />
			<div class="flex flex-col gap-2">
				<p class="text-sm text-muted-foreground">1. Select your side (Affirmative or Negative)</p>
				<p class="text-sm text-muted-foreground">
					2. Provide your case argument. This is the main case position this card supports.
				</p>
				<p class="text-sm text-muted-foreground">
					3. Provide an offcase argument (Optional). This is for disadvantages, counterplans, or
					critiques that this card relates to.
				</p>
				<p class="text-sm text-muted-foreground">4. Provide your card argument (Optional)</p>
				<p class="text-sm text-muted-foreground">
					5. Select one source format (Text, Link, or File)
				</p>
				<p class="text-sm text-muted-foreground">6. Click "Generate Card" to create your card</p>
			</div>
		</div>
	</div>
</div>

{#if import.meta.env.DEV}
	<div class="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
		{#each DEV_TEST_CASES as tc}
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