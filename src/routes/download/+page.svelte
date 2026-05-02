<script lang="ts">
	import AnimateOnScroll from '$lib/components/AnimateOnScroll.svelte';
	import { Download, Monitor, Laptop, Code, Smartphone } from '@lucide/svelte';

	let os = $state('Desktop');
	let SelectedIcon = $derived.by(() => {
		if (os === 'Windows' || os === 'Linux') return Monitor;
		if (os === 'macOS') return Laptop;
		if (os === 'Android' || os === 'iOS') return Smartphone;
		return Download;
	});

	$effect(() => {
		const userAgent = window.navigator.userAgent;
		const platform =
			// @ts-ignore
			(window.navigator.userAgentData?.platform || window.navigator.platform || '').toLowerCase();

		if (platform.includes('win')) os = 'Windows';
		else if (platform.includes('mac')) os = 'macOS';
		else if (platform.includes('linux')) os = 'Linux';
		else if (/android/.test(userAgent.toLowerCase())) os = 'Android';
		else if (/iphone|ipad|ipod/.test(userAgent.toLowerCase())) os = 'iOS';
	});
</script>

<svelte:head>
	<title>Download | MasterDebater</title>
</svelte:head>

<div class="flex min-h-[70vh] flex-col justify-center px-6 py-section md:px-12">
	<div class="mx-auto w-full max-w-[80vw]">
		<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
			<div
				class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase"
			>
				<Download size={14} /> Downloads
			</div>
			<h1 class="mt-6 font-heading text-5xl font-medium text-foreground md:text-7xl">
				Get MasterDebater
			</h1>
			<p class="mt-6 max-w-2xl text-lg leading-relaxed text-secondary md:text-xl">
				The ultimate companion for structured debate. Download the desktop app for a seamless
				offline experience.
			</p>
		</AnimateOnScroll>

		<div class="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
			<AnimateOnScroll animation="animate-fade-in-up" stagger={2}>
				<div
					class="relative overflow-hidden rounded-3xl bg-background-2 p-10 ring-1 ring-border transition-shadow hover:shadow-2xl hover:shadow-primary/10"
				>
					<div class="flex items-start justify-between">
						<div>
							<h3 class="font-heading text-2xl font-medium text-foreground">For {os}</h3>
							<p class="mt-2 text-secondary">Recommended version for your system.</p>
						</div>
						<div class="rounded-2xl bg-primary/10 p-4 text-primary">
							<SelectedIcon size={32} />
						</div>
					</div>

					<div class="mt-12 flex flex-col gap-4">
						<button
							class="press-feedback flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-5 font-semibold text-on-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
						>
							<Download size={20} /> Download v0.1.0 Installer
						</button>
						<button
							class="press-feedback flex w-full items-center justify-center gap-3 rounded-2xl border-3 border-foreground px-8 py-5 font-semibold text-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
						>
							<Download size={20} /> Download v0.1.0 Portable
						</button>
						<p class="text-center text-xs text-muted-foreground">
							.exe, .dmg, or .deb based on your OS
						</p>
					</div>
				</div>
			</AnimateOnScroll>

			<AnimateOnScroll animation="animate-fade-in-up" stagger={3}>
				<div
					class="justify-top flex h-full flex-col gap-6 rounded-3xl border-3 border-dashed border-foreground p-10"
				>
					<h4 class="font-heading text-xl font-medium text-foreground">Other Platforms</h4>
					<div class="grid grid-cols-2 gap-4">
						<button
							class="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border hover:bg-cream-200"
						>
							<Monitor size={16} /> Windows
						</button>
						<button
							class="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border hover:bg-cream-200"
						>
							<Laptop size={16} /> macOS
						</button>
						<button
							class="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border hover:bg-cream-200"
						>
							<Monitor size={16} /> Linux
						</button>
						<button
							class="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border hover:bg-cream-200"
						>
							<Code size={16} /> Raw Source
						</button>
					</div>
					<p class="text-sm text-muted-foreground">
						Mobile versions are not in development. Check back later.
					</p>
					<p class="text-sm text-muted-foreground">
						View the lisence and terms for raw source usage <a
							href="https://github.com/Arnav-Saraf-Official/MasterDebater"><u>here</u></a
						>.
					</p>
				</div>
			</AnimateOnScroll>
		</div>
	</div>
</div>
