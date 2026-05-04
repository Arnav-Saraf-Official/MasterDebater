<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let status = $state('Verifying session...');

	onMount(async () => {
		// Small delay to ensure storage hydration
		await new Promise((r) => setTimeout(r, 200));

		console.log('[Auth] LocalStorage Keys:', Object.keys(localStorage));
		console.log('[Auth] Verifier:', localStorage.getItem('sb-njvfstduswdwdmyntzow-auth-token-code-verifier'));

		// PKCE Flow check: look for 'code' in query params
		const url = new URL(window.location.href);
		const code = url.searchParams.get('code');

		let session = null;

		if (code) {
			status = 'Exchanging code for session...';
			const { data, error } = await supabase.auth.exchangeCodeForSession(code);
			if (error) {
				status = 'Error: ' + error.message;
				console.error('Code exchange error:', error);
				return;
			}
			session = data.session;
		} else {
			// Fallback: check for existing session or hash-based tokens
			const { data, error } = await supabase.auth.getSession();
			if (error) {
				status = 'Error: ' + error.message;
				console.error('Session check error:', error);
				return;
			}
			session = data.session;
		}

		if (session) {
			status = 'Success! Updating app state...';

			// We call our root API endpoint to set the "logged in" status
			try {
				await fetch('/', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: true })
				});
				status = 'Welcome! Redirecting...';
				setTimeout(() => goto('/tools'), 1000);
			} catch (e) {
				console.error('Failed to update server status:', e);
				status = 'Redirecting...';
				setTimeout(() => goto('/tools'), 1000);
			}
		} else {
			status = 'Session not found. Redirecting to login...';
			setTimeout(() => goto('/login'), 2000);
		}
	});
</script>

<svelte:head>
	<title>Authenticating | MasterDebater</title>
</svelte:head>

<div class="flex min-h-[70vh] flex-col items-center justify-center bg-background px-6">
	<div
		class="w-full max-w-md animate-fade-in-up rounded-2xl border border-border bg-card p-10 text-center shadow-xl"
	>
		<div class="mb-6 flex justify-center">
			<div class="relative h-16 w-16">
				<div class="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
				<div
					class="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<svg class="h-8 w-8 animate-spin" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
							fill="none"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				</div>
			</div>
		</div>

		<h2 class="font-heading text-3xl font-medium text-foreground">Authenticating</h2>
		<p class="mt-4 text-secondary">{status}</p>

		<div class="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
			<div
				class="h-full w-1/3 animate-[progress_2s_ease-in-out_infinite] rounded-full bg-primary"
			></div>
		</div>
	</div>
</div>

<style>
	@keyframes progress {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(300%);
		}
	}
</style>
