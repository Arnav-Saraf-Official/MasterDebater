<script lang="ts">
	import { Send, UploadCloud, Link as LinkIcon, Type, FileText, ChevronDown } from '@lucide/svelte';
	import { supabase } from '$lib/supabase';

	let messages = $state([
		{
			role: 'assistant',
			content:
				'Welcome to MasterCard! Provide your case argument and source material (text, link, or file) and I will cut a structured debate card for you.'
		}
	]);

	let side = $state('affirmative');
	let model = $state('Choose Model');
	let caseArgument = $state('');
	let cardArgument = $state('');

	let inputMode = $state('text'); // 'text' | 'link' | 'file'
	let textContent = $state('');
	let linkContent = $state('');
	let fileContent = $state<File | null>(null);

	let isProcessing = $state(false);
	let fileInputEl = $state<HTMLInputElement>();

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			fileContent = target.files[0];
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		// Validation logic
		if (!caseArgument) return;
		if (inputMode === 'text' && !textContent) return;
		if (inputMode === 'link' && !linkContent) return;
		if (inputMode === 'file' && !fileContent) return;

		// Add user message
		let userMessage = `[${side === 'affirmative' ? 'Affirmative' : 'Negative'}] Case: ${caseArgument}\n`;
		if (cardArgument) {
			userMessage += `Card: ${cardArgument}\n`;
		}

		if (inputMode === 'text') {
			userMessage += `Source (Text): ${textContent.substring(0, 150)}...`;
		} else if (inputMode === 'link') {
			userMessage += `Source (Link): ${linkContent}`;
		} else if (inputMode === 'file' && fileContent) {
			userMessage += `Source (File): ${fileContent.name}`;
		}

		messages = [...messages, { role: 'user', content: userMessage }];

		// Reset inputs
		caseArgument = '';
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
			messages = [
				...messages,
				{ role: 'assistant', content: 'You must be logged in to generate cards.' }
			];
			isProcessing = false;
			return;
		}

		// Ensure we have an API key; regenerate if missing
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
			messages = [
				...messages,
				{ role: 'assistant', content: 'Failed to obtain an API key. Please log out and log back in.' }
			];
			isProcessing = false;
			return;
		}

		const formData = new FormData();
		formData.append('api_key', apiKey);
		formData.append('model', model);
		formData.append('side', side);
		formData.append('caseArgument', caseArgument);
		formData.append('cardArgument', cardArgument);
		formData.append('inputMode', inputMode);
		if (inputMode === 'text') formData.append('textContent', textContent);
		if (inputMode === 'link') formData.append('linkContent', linkContent);
		if (inputMode === 'file' && fileContent) formData.append('fileContent', fileContent);

		try {
			const res = await fetch('/tools/mastercard', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`
				},
				body: formData
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to generate card');
			}

			const result = await res.json();
			const content = result.choices?.[0]?.message?.content || 'No response from AI.';

			messages = [
				...messages,
				{
					role: 'assistant',
					content: content
				}
			];
		} catch (e: any) {
			messages = [
				...messages,
				{
					role: 'assistant',
					content: `Error: ${e.message}`
				}
			];
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
				{#each messages as message}
					<div class="flex w-full {message.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-[85%] rounded-2xl p-4 shadow-sm {message.role === 'user'
								? 'rounded-tr-sm bg-primary text-on-primary'
								: 'rounded-tl-sm bg-background text-foreground ring-1 ring-border'}"
						>
							{#if message.role === 'assistant'}
								<div class="mb-2 flex items-center gap-2">
									<FileText size={14} class="text-primary" />
									<span class="text-xs font-semibold tracking-wider text-primary uppercase"
										>MasterCard</span
									>
								</div>
							{/if}
							<div
								class="text-sm leading-relaxed whitespace-pre-wrap {message.role === 'user'
									? 'text-on-primary/90'
									: 'text-foreground'}"
							>
								{@html message.content.replace(
									/\*\*(.*?)\*\*/g,
									'<strong class="font-semibold">$1</strong>'
								)}
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
					<!-- Row 1: Side, Case Arg, Card Arg -->
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
						<div class="md:col-span-5">
							<input
								type="text"
								bind:value={caseArgument}
								placeholder="Case Argument (Required, short response)"
								required
								class="press-feedback w-full rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
							/>
						</div>
						<div class="md:col-span-4">
							<input
								type="text"
								bind:value={cardArgument}
								placeholder="Card Argument (Optional, short response)"
								class="press-feedback w-full rounded-lg bg-background px-4 py-2.5 text-sm ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
							/>
						</div>
					</div>

					<!-- Row 2: Source Input Tabs -->
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
									required
									rows="4"
									placeholder="Paste your long response source text here..."
									class="w-full resize-y rounded-lg bg-card px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30 focus:outline-none"
								></textarea>
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

					<!-- Submit Button -->
					<div class="flex items-center justify-between pt-2">
						<span class="text-xs text-muted-foreground"
							>Select one source format above. Only the active tab will be submitted.</span
						>
						<button
							type="submit"
							disabled={isProcessing}
							class="press-feedback flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-on-primary shadow-md transition-all hover:bg-amber-warm-light hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Send size={16} />
							{isProcessing ? 'Processing...' : 'Generate Card'}
						</button>
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
					2. Provide your case argument. If you are Affirmative, this would be oncase. If you are
					Negative, this would be case or contention/offcase. This is used to help the AI utilize
					the content in your source to generate a card even if you don't provide a card argument.
				</p>
				<p class="text-sm text-muted-foreground">3. Provide your card argument (Optional)</p>
				<p class="text-sm text-muted-foreground">
					4. Select one source format (Text, Link, or File)
				</p>
				<p class="text-sm text-muted-foreground">5. Click "Generate Card" to create your card</p>
			</div>
		</div>
	</div>
</div>
