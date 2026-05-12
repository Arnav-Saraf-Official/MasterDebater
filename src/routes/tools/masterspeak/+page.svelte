<script lang="ts">
	import { Send, UploadCloud, FileText, Trash2, Mic, Settings, Copy } from '@lucide/svelte';
	import { browser } from '$app/environment';
	import { processMasterSpeakDoc } from '$lib/masterspeak';
	import DOMPurify from 'dompurify';

	const WELCOME = 'Welcome to MasterSpeak! Upload a .docx file with your cards to get started.';

	let messages = $state<{ role: string; content: string; timestamp?: number }[]>([
		{ role: 'assistant', content: WELCOME }
	]);
	let activeToast = $state<{ label: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout>;
	let chatEl = $state<HTMLElement>();

	$effect(() => {
		void messages.length;
		chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
	});

	let fileContent = $state<File | null>(null);
	let isProcessing = $state(false);
	let fileInputEl = $state<HTMLInputElement>();

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			if (file.name.endsWith('.docx')) {
				fileContent = file;
				handleSubmit();
			} else {
				triggerToast('Only .docx files are accepted.');
				if (fileInputEl) fileInputEl.value = '';
			}
		}
	}

	async function handleSubmit() {
		if (!fileContent) return;

		const userMessage = `Uploaded: **${fileContent.name}**`;
		messages = [...messages, { role: 'user', content: userMessage, timestamp: Date.now() }];

		const submittedFile = fileContent;
		fileContent = null;
		if (fileInputEl) fileInputEl.value = '';

		isProcessing = true;

		try {
			const result = await processMasterSpeakDoc(submittedFile);
			messages = [...messages, { role: 'assistant', content: result, timestamp: Date.now() }];
		} catch (e: any) {
			messages = [
				...messages,
				{ role: 'assistant', content: `Error: ${e.message}`, timestamp: Date.now() }
			];
		} finally {
			isProcessing = false;
		}
	}

	function clearChat() {
		messages = [{ role: 'assistant', content: WELCOME }];
	}

	async function copyMessage(content: string) {
		try {
			await navigator.clipboard.writeText(content);
			triggerToast('Copied to clipboard!');
		} catch (err) {
			triggerToast('Failed to copy.');
		}
	}

	function triggerToast(label: string) {
		clearTimeout(toastTimer);
		activeToast = { label };
		toastTimer = setTimeout(() => (activeToast = null), 3000);
	}

	function relativeTime(ts: number): string {
		const diff = Math.floor((Date.now() - ts) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	// Simple markdown-ish renderer
	function renderDisplay(raw: string): string {
		return raw.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
	}
</script>

<svelte:head>
	<title>MasterSpeak | MasterDebater</title>
</svelte:head>

<div class="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-[95vw] flex-col px-6 pt-32 pb-12">
	<!-- Chat Header -->
	<div
		class="stagger-1 mb-8 flex animate-fade-in-up flex-col items-center justify-center text-center"
	>
		<div
			class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
		>
			<Mic size={32} />
		</div>
		<h1 class="font-heading text-4xl font-medium text-foreground">MasterSpeak</h1>
		<p class="mt-2 max-w-lg text-muted-foreground">
			Upload your speech doc to compile all of your cards into a single, polished speech.
		</p>
	</div>

	<div class="flex gap-6">
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Chat Window -->
			<div
				bind:this={chatEl}
				class="stagger-2 mb-6 flex min-h-[500px] flex-1 animate-fade-in-up flex-col space-y-4 overflow-y-auto rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
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
							class="group max-w-[85%] rounded-2xl p-4 shadow-sm {message.role === 'user'
								? 'rounded-tr-sm bg-primary text-on-primary'
								: 'rounded-tl-sm bg-background text-foreground ring-1 ring-border'}"
						>
							{#if message.role === 'assistant'}
								<div class="mb-2 flex items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<Mic size={14} class="text-primary" />
										<span class="text-xs font-semibold tracking-wider text-primary uppercase"
											>MasterSpeak</span
										>
									</div>
									{#if message.content !== WELCOME}
										<button
											type="button"
											onclick={() => copyMessage(message.content)}
											class="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-all select-none hover:bg-card hover:text-foreground active:scale-95"
											title="Copy text"
										>
											<Copy size={12} />
											<span>Copy</span>
										</button>
									{/if}
								</div>
							{/if}
							<div
								class={message.role === 'user'
									? 'text-sm leading-relaxed whitespace-pre-wrap text-on-primary/90'
									: 'text-sm leading-relaxed text-foreground'}
							>
								{@html DOMPurify.sanitize(renderDisplay(message.content), { ALLOWED_TAGS: ['strong','span','mark','div','br'], ALLOWED_ATTR: ['class','style'] })}
							</div>
							{#if message.timestamp}
								<div
									class="mt-2 flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100"
								>
									<span class="text-[10px] text-muted-foreground/40"
										>{relativeTime(message.timestamp)}</span
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
								<Mic size={14} class="text-primary" />
								<span class="text-xs font-semibold tracking-wider text-primary uppercase"
									>MasterSpeak</span
								>
							</div>
							<div class="mt-2 flex flex-col gap-2">
								<div class="skeleton h-3 w-64 rounded"></div>
								<div class="skeleton h-3 w-48 rounded"></div>
								<div class="skeleton h-3 w-32 rounded"></div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Input Area -->
			<div
				class="stagger-3 animate-fade-in-up rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
			>
				<div class="flex flex-col items-center justify-center">
					<label
						class="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card transition-all hover:border-primary/40 hover:bg-primary/5"
					>
						<div class="flex flex-col items-center justify-center pt-5 pb-6">
							<UploadCloud class="mb-2 h-8 w-8 text-muted-foreground" />
							<p class="text-sm font-medium text-foreground">
								Click to upload or drag and drop your speech script
							</p>
							<p class="mt-1 text-xs text-muted-foreground">Only .docx files are accepted</p>
							{#if fileContent}
								<p class="mt-3 text-sm font-semibold text-primary">{fileContent.name}</p>
							{/if}
						</div>
						<input
							bind:this={fileInputEl}
							onchange={handleFileChange}
							type="file"
							class="hidden"
							accept=".docx"
							disabled={isProcessing}
						/>
					</label>
				</div>
			</div>
		</div>

		<!-- Sidebar Guide -->
		<aside class="max-w-[20vw]">
			<div
				class="stagger-3 sticky top-32 animate-fade-in-up space-y-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
			>
				<div>
					<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
						<Settings size={18} class="text-primary" />
						Guide
					</h2>
					<div class="mt-4 space-y-4">
						<div>
							<h3 class="text-xs font-bold text-muted-foreground uppercase">Format</h3>
							<p class="mt-1 text-sm text-foreground">
								Only <strong>.docx</strong> files are supported for processing.
							</p>
						</div>
						<div>
							<h3 class="text-xs font-bold text-muted-foreground uppercase">How it works</h3>
							<ul class="mt-2 space-y-2 text-sm text-muted-foreground">
								<li class="flex gap-2">
									<span class="font-bold text-primary">1.</span>
									<span>
										Upload your cards with
										<a
											href="https://paperlessdebate.com/verbatim/"
											target="_blank"
											class="text-accent">Verbatim</a
										>/standard formating as a .docx.
									</span>
								</li>
								<li class="flex gap-2">
									<span class="font-bold text-primary">2.</span>
									Our AI engine will analyze your card structure and tags.
								</li>
								<li class="flex gap-2">
									<span class="font-bold text-primary">3.</span>
									It will compile and give a polished "read-off" document.
								</li>
							</ul>
						</div>
						<div class="rounded-lg bg-primary/5 p-4 ring-1 ring-primary/10">
							<p class="text-xs leading-relaxed text-primary">
								<strong>Note:</strong> Make sure your doc only contains cards. We currently do not support
								any additional features such as hats, pocket, block, etc.
							</p>
						</div>
					</div>
				</div>
			</div>
		</aside>
	</div>
</div>

{#if activeToast}
	<div
		class="toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg"
	>
		{activeToast.label}
	</div>
{/if}

<style>
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
		10% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		90% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateX(-50%) translateY(8px);
		}
	}
	.toast {
		animation: toast-in-out 3s ease forwards;
	}
</style>
