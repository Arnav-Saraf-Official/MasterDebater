<script>
	import { slide } from 'svelte/transition';
	import { Menu, Settings, User } from '@lucide/svelte';
	import { page } from '$app/state';
	let hovering = $state(false);
</script>

<div class="pointer-events-none fixed top-6 right-0 left-0 z-50 flex justify-center px-4">
	<div
		class="floating-island pointer-events-auto flex items-center overflow-hidden"
		role="presentation"
		onmouseenter={() => (hovering = true)}
		onmouseleave={() => (hovering = false)}
	>
		<!-- Brand & Version -->
		<a href="/" class="flex shrink-0 items-center gap-3 px-6 py-3">
			<span class="text-primary-muted font-heading text-xl font-medium tracking-wide"
				>MasterDebater</span
			>
			<span
				class="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-primary uppercase"
				>v0.1</span
			>
		</a>

		<!-- Expanded Content -->
		{#if hovering}
			<div transition:slide={{ axis: 'x', duration: 400 }} class="flex items-center">
				<div class="h-6 w-[1px] bg-primary/20"></div>
				<a
					href="/about"
					class="press-feedback mx-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium whitespace-nowrap text-on-primary transition-colors hover:bg-primary/90"
				>
					About
				</a>
				<a
					href="/tools/mastercard"
					class="press-feedback mx-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium whitespace-nowrap text-on-primary transition-colors hover:bg-primary/90"
				>
					MasterCard
				</a>
				<a
					href="/tools/masterspeak"
					class="press-feedback mx-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium whitespace-nowrap text-on-primary transition-colors hover:bg-primary/90"
				>
					MasterSpeak
				</a>
				{#if page.url.pathname !== '/login'}
					<a class="press-feedback mr-4 text-primary" href="/login" aria-label="Login">
						<User size={20} strokeWidth={2.5} />
					</a>
				{/if}
				<a class="settings press-feedback mr-4 text-primary" href="/settings" aria-label="Settings">
					<Settings size={20} strokeWidth={2.5} />
				</a>
			</div>
		{/if}

		<!-- Menu Icon Wrapper -->
		<div class="menu-trigger flex items-center pr-3 pl-3">
			<Menu size={20} class="text-primary" strokeWidth={2.5} />
		</div>
	</div>
</div>

<style>
	.floating-island {
		background: color-mix(in srgb, var(--color-background-2), transparent 30%);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 9999px;
		border: 1px solid color-mix(in srgb, var(--color-primary), transparent 70%);
		box-shadow:
			0 8px 32px -8px color-mix(in srgb, var(--color-primary), transparent 60%),
			0 0 0 1px color-mix(in srgb, var(--color-primary), transparent 90%) inset;
		animation: float 6s ease-in-out infinite;
		transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
		cursor: pointer;
	}

	.floating-island:hover {
		background: color-mix(in srgb, var(--color-background-2), transparent 15%);
		border-color: color-mix(in srgb, var(--color-primary), transparent 50%);
		box-shadow:
			0 16px 40px -8px color-mix(in srgb, var(--color-primary), transparent 50%),
			0 0 0 1px color-mix(in srgb, var(--color-primary), transparent 85%) inset;
		transform: scale(1.02);
	}

	.menu-trigger {
		transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.floating-island:hover .menu-trigger {
		transform: rotate(180deg);
	}
	.settings {
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.settings:hover {
		color: color-mix(in srgb, var(--color-primary), black 30%);
		transform: rotate(90deg);
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-8px);
		}
	}
</style>
