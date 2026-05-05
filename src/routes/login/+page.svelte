<script lang="ts">
	import { supabase } from '$lib/supabase';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { Mail, Lock, LogIn, LogOut } from '@lucide/svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let message = $state({ type: '', text: '' });
	let session = $state<any>(null);

	$effect(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, s) => {
			session = s;
		});

		return () => subscription.unsubscribe();
	});

	// -----------------------------
	// EMAIL LOGIN (CLEANED UP)
	// -----------------------------
	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		message = { type: '', text: '' };

		try {
			const { data: signInData, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				// fallback: create account
				const { error: signUpError } = await supabase.auth.signUp({
					email,
					password
				});

				if (signUpError) {
					message = { type: 'error', text: signUpError.message };
				} else {
					message = {
						type: 'success',
						text: 'Account created. Check email or continue login.'
					};
				}
			} else {
				if (signInData?.session) {
					const res = await fetch('/', {
						method: 'POST',
						headers: { Authorization: `Bearer ${signInData.session.access_token}` }
					});
					if (res.ok) {
						const data = await res.json();
						if (data.api_key) localStorage.setItem('masterdebater_api_key', data.api_key);
					} else {
						const errData = await res.json();
						console.error('[Auth] API key generation failed:', errData.error);
					}
				}
				message = { type: 'success', text: 'Logged in successfully!' };
				window.location.href = '/tools';
			}
		} finally {
			loading = false;
		}
	}

	async function loginWithGoogle() {
		message = { type: '', text: '' };

		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				// IMPORTANT FOR ELECTRON / DESKTOP APPS
				redirectTo: 'masterdebater://callback'
			}
		});

		if (error) {
			message = { type: 'error', text: error.message };
		}
	}

	async function handleLogout() {
		const { error } = await supabase.auth.signOut();
		localStorage.removeItem('masterdebater_api_key');
		if (error) {
			message = { type: 'error', text: error.message };
		} else {
			message = { type: 'success', text: 'Logged out successfully.' };
		}
	}
</script>

<svelte:head>
	<title>Login | MasterDebater</title>
</svelte:head>

<div class="relative grid min-h-[calc(100vh-120px)] w-full grid-cols-1 lg:grid-cols-2">
	{#if session}
		<div class="stagger-1 absolute top-8 right-8 z-10 animate-fade-in">
			<button
				onclick={handleLogout}
				class="press-feedback flex items-center gap-2 rounded-xl bg-background/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur-sm transition-all hover:bg-cream-200"
			>
				<LogOut size={16} class="text-primary" />
				Logout
			</button>
		</div>
	{/if}
	<!-- Left Side: Hero Section -->
	<div class="hidden flex-col justify-center border-r border-border bg-background lg:flex">
		<HeroSection />
	</div>

	<!-- Right Side: Login Form -->
	<div class="flex flex-col items-center justify-center bg-card px-6 py-12 sm:px-12">
		<div class="stagger-1 w-full max-w-md animate-fade-in-up">
			<div class="mb-8 text-center lg:text-left">
				<h2 class="font-heading text-4xl font-medium text-foreground">Welcome Back</h2>
				<p class="mt-2 text-sm text-muted-foreground">Sign in or create an account to continue.</p>
			</div>

			{#if message.text}
				<div
					class="mb-6 rounded-lg p-4 text-sm {message.type === 'error'
						? 'bg-red-500/10 text-red-700'
						: 'bg-primary/10 text-primary'}"
				>
					{message.text}
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-4">
				<div>
					<label for="email" class="mb-1.5 block text-sm font-medium text-foreground">Email</label>
					<div class="relative">
						<div
							class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground"
						>
							<Mail size={16} />
						</div>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							placeholder="you@example.com"
							class="press-feedback w-full rounded-lg bg-background py-2.5 pr-4 pl-10 text-sm text-foreground ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="mb-1.5 block text-sm font-medium text-foreground"
						>Password</label
					>
					<div class="relative">
						<div
							class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground"
						>
							<Lock size={16} />
						</div>
						<input
							type="password"
							id="password"
							bind:value={password}
							required
							placeholder="••••••••"
							class="press-feedback w-full rounded-lg bg-background py-2.5 pr-4 pl-10 text-sm text-foreground ring-1 ring-border transition-all placeholder:text-muted-foreground/60 hover:bg-cream-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="press-feedback mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-md transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<LogIn size={16} />
					{loading ? 'Authenticating...' : 'Sign In / Sign Up'}
				</button>
			</form>

			<div class="relative my-8">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-border"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="bg-card px-2 text-muted-foreground">Or continue with</span>
				</div>
			</div>

			<button
				type="button"
				onclick={loginWithGoogle}
				class="press-feedback flex w-full items-center justify-center gap-3 rounded-lg bg-background px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:bg-cream-200"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				Google
			</button>
		</div>
	</div>
</div>
