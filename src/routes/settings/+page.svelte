<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import AnimateOnScroll from '$lib/components/AnimateOnScroll.svelte';
	import { Settings, User, CreditCard, Eye, EyeOff, Moon, Sun, Accessibility, LogOut, Copy, Check } from '@lucide/svelte';

	let user = $state<{ id?: string; email?: string; created_at?: string } | null>(null);
	let loading = $state(true);
	let showEmail = $state(false);
	let emailCopied = $state(false);
	let theme = $state<'light' | 'dark'>('dark');
	let reducedMotion = $state(false);
	let highContrast = $state(false);

	function applyClasses(t: 'light' | 'dark', rm: boolean, hc: boolean) {
		document.documentElement.classList.toggle('light', t === 'light');
		document.documentElement.classList.toggle('reduce-motion', rm);
		document.documentElement.classList.toggle('high-contrast', hc);
	}

	function cacheLocally(t: 'light' | 'dark', rm: boolean, hc: boolean) {
		localStorage.setItem('theme', t);
		localStorage.setItem('reducedMotion', String(rm));
		localStorage.setItem('highContrast', String(hc));
	}

	async function savePrefs(patch: { theme?: 'light' | 'dark'; reduced_motion?: boolean; high_contrast?: boolean }) {
		if (!user?.id) return;
		await supabase.from('user_preferences').upsert(
			{ user_id: user.id, theme, reduced_motion: reducedMotion, high_contrast: highContrast, ...patch },
			{ onConflict: 'user_id' }
		);
	}

	onMount(async () => {
		const cachedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
		const cachedRm = localStorage.getItem('reducedMotion') === 'true';
		const cachedHc = localStorage.getItem('highContrast') === 'true';
		if (cachedTheme) { theme = cachedTheme; reducedMotion = cachedRm; highContrast = cachedHc; }
		applyClasses(theme, reducedMotion, highContrast);

		const { data } = await supabase.auth.getUser();
		user = data.user ?? null;
		loading = false;

		if (user?.id) {
			const { data: prefs } = await supabase
				.from('user_preferences')
				.select('theme, reduced_motion, high_contrast')
				.eq('user_id', user.id)
				.single();

			if (prefs) {
				theme = prefs.theme;
				reducedMotion = prefs.reduced_motion;
				highContrast = prefs.high_contrast;
				cacheLocally(theme, reducedMotion, highContrast);
				applyClasses(theme, reducedMotion, highContrast);
			}
		}
	});

	async function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		applyClasses(theme, reducedMotion, highContrast);
		cacheLocally(theme, reducedMotion, highContrast);
		await savePrefs({ theme });
	}

	async function toggleReducedMotion() {
		reducedMotion = !reducedMotion;
		applyClasses(theme, reducedMotion, highContrast);
		cacheLocally(theme, reducedMotion, highContrast);
		await savePrefs({ reduced_motion: reducedMotion });
	}

	async function toggleHighContrast() {
		highContrast = !highContrast;
		applyClasses(theme, reducedMotion, highContrast);
		cacheLocally(theme, reducedMotion, highContrast);
		await savePrefs({ high_contrast: highContrast });
	}

	async function copyEmail() {
		if (!user?.email) return;
		await navigator.clipboard.writeText(user.email);
		emailCopied = true;
		setTimeout(() => (emailCopied = false), 2000);
	}

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}

	function formatDate(iso?: string) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Settings | MasterDebater</title>
</svelte:head>

<main id="main-content">
	<section class="flex min-h-[40vh] flex-col justify-center py-section pt-32">
		<div class="mx-auto w-full max-w-[80vw]">
			<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
				<div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
					<Settings size={14} aria-hidden="true" /> Account Settings
				</div>
				<h1 class="mt-6 font-heading text-5xl font-medium text-foreground md:text-7xl">Settings</h1>
				<p class="mt-4 max-w-2xl text-lg leading-relaxed text-secondary">
					Manage your account, preferences, and accessibility options.
				</p>
			</AnimateOnScroll>
		</div>
	</section>

	<section class="px-6 pb-24 md:px-12" aria-label="Settings panels">
		<div class="mx-auto w-full max-w-[80vw] space-y-6">

			<!-- Account -->
			<AnimateOnScroll animation="animate-fade-in-up" stagger={2}>
				<div class="settings-card" role="region" aria-labelledby="account-heading">
					<div class="card-header">
						<div class="icon-badge">
							<User size={18} aria-hidden="true" />
						</div>
						<div>
							<h2 id="account-heading" class="font-heading text-xl font-medium text-foreground">Account</h2>
							<p class="text-xs text-secondary mt-0.5">Your profile and sign-in details</p>
						</div>
					</div>

					{#if loading}
						<div class="space-y-3">
							{#each [1, 2] as _}
								<div class="skeleton h-12 rounded-xl"></div>
							{/each}
						</div>
					{:else if user}
						<div class="space-y-3">
							<div class="info-row">
								<div>
									<p class="text-xs font-semibold tracking-wider text-secondary uppercase">Email</p>
									<p class="mt-1 text-sm font-medium text-foreground font-mono">
										{#if showEmail}
											{user.email}
										{:else}
											{'•'.repeat(Math.min((user.email ?? '').length, 20))}
										{/if}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<button
										onclick={() => (showEmail = !showEmail)}
										class="icon-btn press-feedback"
										aria-label={showEmail ? 'Hide email' : 'Show email'}
										title={showEmail ? 'Hide email' : 'Show email'}
									>
										{#if showEmail}
											<EyeOff size={16} aria-hidden="true" />
										{:else}
											<Eye size={16} aria-hidden="true" />
										{/if}
									</button>
									{#if showEmail}
										<button
											onclick={copyEmail}
											class="icon-btn press-feedback"
											aria-label="Copy email"
											title="Copy email"
										>
											{#if emailCopied}
												<Check size={16} class="text-green-600" aria-hidden="true" />
											{:else}
												<Copy size={16} aria-hidden="true" />
											{/if}
										</button>
									{/if}
								</div>
							</div>

							<div class="info-row">
								<div>
									<p class="text-xs font-semibold tracking-wider text-secondary uppercase">Member since</p>
									<p class="mt-1 text-sm font-medium text-foreground">{formatDate(user.created_at)}</p>
								</div>
								<span class="plan-badge">Free</span>
							</div>
						</div>

						<div class="mt-5 pt-5 border-t border-primary/10">
							<button onclick={signOut} class="danger-btn press-feedback">
								<LogOut size={15} aria-hidden="true" />
								Sign out
							</button>
						</div>
					{:else}
						<div class="info-row">
							<p class="text-sm text-secondary">
								<a href="/login" class="text-primary font-medium hover:underline">Sign in</a> to view your account.
							</p>
						</div>
					{/if}
				</div>
			</AnimateOnScroll>

			<!-- Usage & Billing -->
			<AnimateOnScroll animation="animate-fade-in-up" stagger={3}>
				<div class="settings-card" role="region" aria-labelledby="billing-heading">
					<div class="card-header">
						<div class="icon-badge">
							<CreditCard size={18} aria-hidden="true" />
						</div>
						<div>
							<h2 id="billing-heading" class="font-heading text-xl font-medium text-foreground">Usage &amp; Billing</h2>
							<p class="text-xs text-secondary mt-0.5">Your plan and monthly activity</p>
						</div>
					</div>

					<div class="space-y-3">
						<div class="info-row">
							<div>
								<p class="text-xs font-semibold tracking-wider text-secondary uppercase">Current plan</p>
								<p class="mt-1 text-sm font-medium text-foreground">Free tier</p>
							</div>
							<span class="plan-badge">Free</span>
						</div>

						<div class="stat-grid">
							<div class="stat-tile">
								<p class="stat-value">—</p>
								<p class="stat-label">AI requests this month</p>
							</div>
							<div class="stat-tile">
								<p class="stat-value">—</p>
								<p class="stat-label">Documents processed</p>
							</div>
						</div>
					</div>

					<p class="mt-4 text-xs text-secondary/70 italic">Detailed analytics coming soon.</p>
				</div>
			</AnimateOnScroll>

			<!-- Appearance & Accessibility -->
			<AnimateOnScroll animation="animate-fade-in-up" stagger={4}>
				<div class="settings-card" role="region" aria-labelledby="a11y-heading">
					<div class="card-header">
						<div class="icon-badge">
							<Accessibility size={18} aria-hidden="true" />
						</div>
						<div>
							<h2 id="a11y-heading" class="font-heading text-xl font-medium text-foreground">Appearance &amp; Accessibility</h2>
							<p class="text-xs text-secondary mt-0.5">Customize your visual experience</p>
						</div>
					</div>

					<div class="space-y-2">
						<!-- Theme toggle -->
						<div class="toggle-row">
							<div class="toggle-label-group">
								{#if theme === 'dark'}
									<Moon size={16} class="text-primary shrink-0" aria-hidden="true" />
								{:else}
									<Sun size={16} class="text-primary shrink-0" aria-hidden="true" />
								{/if}
								<div>
									<p class="text-sm font-medium text-foreground">Theme</p>
									<p class="text-xs text-secondary mt-0.5">Currently {theme === 'dark' ? 'dark' : 'light'} mode</p>
								</div>
							</div>
							<button
								onclick={toggleTheme}
								class="theme-pill press-feedback"
								aria-pressed={theme === 'light'}
								aria-label="Toggle theme"
							>
								<span class="theme-pill-track" class:active={theme === 'dark'}>
									<Moon size={11} aria-hidden="true" />
								</span>
								<span class="theme-pill-track" class:active={theme === 'light'}>
									<Sun size={11} aria-hidden="true" />
								</span>
							</button>
						</div>

						<div class="divider"></div>

						<!-- Reduced motion -->
						<div class="toggle-row">
							<div class="toggle-label-group">
								<div class="motion-icon" aria-hidden="true">
									<span class={reducedMotion ? 'opacity-30' : 'opacity-100'}>◎</span>
								</div>
								<div>
									<p class="text-sm font-medium text-foreground">Reduce motion</p>
									<p class="text-xs text-secondary mt-0.5">Minimizes animations across the UI</p>
								</div>
							</div>
							<button
								role="switch"
								aria-checked={reducedMotion}
								onclick={toggleReducedMotion}
								class="toggle press-feedback"
								class:on={reducedMotion}
								aria-label="Reduce motion"
							>
								<span class="toggle-thumb" class:translate-x-5={reducedMotion} class:translate-x-0.5={!reducedMotion}></span>
							</button>
						</div>

						<div class="divider"></div>

						<!-- High contrast -->
						<div class="toggle-row">
							<div class="toggle-label-group">
								<div class="contrast-icon" aria-hidden="true">
									<span class="half-circle"></span>
								</div>
								<div>
									<p class="text-sm font-medium text-foreground">High contrast</p>
									<p class="text-xs text-secondary mt-0.5">Increases contrast for improved readability</p>
								</div>
							</div>
							<button
								role="switch"
								aria-checked={highContrast}
								onclick={toggleHighContrast}
								class="toggle press-feedback"
								class:on={highContrast}
								aria-label="High contrast"
							>
								<span class="toggle-thumb" class:translate-x-5={highContrast} class:translate-x-0.5={!highContrast}></span>
							</button>
						</div>
					</div>
				</div>
			</AnimateOnScroll>

		</div>
	</section>
</main>

<style>
	.settings-card {
		background: color-mix(in srgb, var(--color-card), transparent 30%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 1.25rem;
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 82%);
		padding: 1.5rem;
		box-shadow:
			0 4px 24px -4px color-mix(in srgb, var(--color-primary), transparent 88%),
			0 1px 0 0 color-mix(in srgb, var(--color-background), transparent 0%) inset;
		transition: box-shadow 0.2s ease, border-color 0.2s ease;
	}

	.settings-card:hover {
		border-color: color-mix(in srgb, var(--color-primary), transparent 65%);
		box-shadow:
			0 8px 32px -4px color-mix(in srgb, var(--color-primary), transparent 80%),
			0 1px 0 0 color-mix(in srgb, var(--color-background), transparent 0%) inset;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		margin-bottom: 1.25rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-primary), transparent 88%);
	}

	.icon-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.625rem;
		background: color-mix(in srgb, var(--color-primary), transparent 85%);
		color: var(--color-primary);
		flex-shrink: 0;
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 70%);
	}

	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: color-mix(in srgb, var(--color-background), transparent 40%);
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 90%);
		border-radius: 0.875rem;
		padding: 0.875rem 1rem;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		color: var(--color-secondary);
		background: color-mix(in srgb, var(--color-primary), transparent 92%);
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 85%);
		transition: all 0.15s ease;
	}

	.icon-btn:hover {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary), transparent 80%);
		border-color: color-mix(in srgb, var(--color-primary), transparent 65%);
	}

	.plan-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--color-primary), transparent 85%);
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 70%);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-primary);
		white-space: nowrap;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.stat-tile {
		background: color-mix(in srgb, var(--color-background), transparent 40%);
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 90%);
		border-radius: 0.875rem;
		padding: 1rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-family: var(--font-heading);
		font-weight: 600;
		color: var(--color-foreground);
		line-height: 1;
	}

	.stat-label {
		font-size: 0.7rem;
		color: var(--color-secondary);
		margin-top: 0.375rem;
		line-height: 1.3;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0;
		gap: 1rem;
	}

	.toggle-label-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.divider {
		height: 1px;
		background: color-mix(in srgb, var(--color-primary), transparent 90%);
	}

	/* Toggle switch */
	.toggle {
		position: relative;
		display: inline-flex;
		align-items: center;
		width: 2.75rem;
		height: 1.5rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--color-primary), transparent 80%);
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 70%);
		transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
		flex-shrink: 0;
		cursor: pointer;
	}

	.toggle.on {
		background: var(--color-primary);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 75%);
	}

	.toggle-thumb {
		position: absolute;
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 9999px;
		background: white;
		box-shadow: 0 1px 4px rgba(0,0,0,0.2);
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	/* Theme pill */
	.theme-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		padding: 0.25rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--color-background-2), transparent 20%);
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 75%);
		cursor: pointer;
		transition: border-color 0.2s ease;
	}

	.theme-pill-track {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 9999px;
		color: var(--color-secondary);
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.theme-pill-track.active {
		background: var(--color-primary);
		color: white;
		box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary), transparent 60%);
		transform: scale(1.05);
	}

	/* Sign out */
	.danger-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 0.625rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-destructive);
		background: color-mix(in srgb, var(--color-destructive), transparent 92%);
		border: 1px solid color-mix(in srgb, var(--color-destructive), transparent 80%);
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.danger-btn:hover {
		background: color-mix(in srgb, var(--color-destructive), transparent 82%);
		border-color: color-mix(in srgb, var(--color-destructive), transparent 60%);
	}

	/* Skeleton */
	.skeleton {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-primary), transparent 90%) 25%,
			color-mix(in srgb, var(--color-primary), transparent 80%) 50%,
			color-mix(in srgb, var(--color-primary), transparent 90%) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.motion-icon {
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.contrast-icon {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		border: 2px solid var(--color-primary);
		overflow: hidden;
		flex-shrink: 0;
		position: relative;
	}

	.half-circle {
		position: absolute;
		inset: 0;
		background: var(--color-primary);
		clip-path: inset(0 50% 0 0);
	}
</style>
