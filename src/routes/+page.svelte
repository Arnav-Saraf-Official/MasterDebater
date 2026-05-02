<script lang="ts">
	import HeroSection from '$lib/components/HeroSection.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import CtaSection from '$lib/components/CtaSection.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import AnimateOnScroll from '$lib/components/AnimateOnScroll.svelte';

	const features = [
		{
			icon: '🧠',
			title: 'Structured Thinking',
			description:
				'Break down complex arguments into clear, logical components. Build your case methodically with guided prompts and frameworks.'
		},
		{
			icon: '⚡',
			title: 'Rapid Preparation',
			description:
				'Go from topic to fully prepared in minutes. Smart suggestions help you anticipate counterarguments and strengthen weak points.'
		},
		{
			icon: '🎯',
			title: 'Focused Practice',
			description:
				'Simulate debate scenarios, track your improvement over time, and refine your delivery with targeted feedback loops.'
		}
	];
</script>

<svelte:head>
	<title>MasterDebater — Sharpen Your Arguments</title>
	<meta
		name="description"
		content="A thoughtful desktop app for structured debate preparation and argument building."
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Navigation — minimal, cream background, right-aligned brand -->
	<nav class="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
		<div class="mx-auto flex w-full max-w-[720px] items-center justify-between px-6 py-4">
			<span class="text-sm font-medium text-muted-foreground">v0.1</span>
			<span class="font-heading text-lg font-medium text-primary">MasterDebater</span>
		</div>
	</nav>

	<HeroSection />

	<!-- Features section -->
	<section id="features" class="px-6 py-section md:px-12">
		<div class="mx-auto w-full max-w-[680px]">
			<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
				<h2 class="font-heading text-right text-3xl font-medium text-foreground md:text-4xl">
					Why MasterDebater?
				</h2>
			</AnimateOnScroll>

			<AnimateOnScroll animation="animate-fade-in" stagger={2}>
				<p class="mt-3 text-muted-foreground">Three things that set this tool apart from the rest.</p>
			</AnimateOnScroll>

			<div class="mt-10 grid gap-6 sm:grid-cols-3">
				{#each features as feature, i}
					<FeatureCard
						icon={feature.icon}
						title={feature.title}
						description={feature.description}
						stagger={i + 1}
					/>
				{/each}
			</div>
		</div>
	</section>

	<CtaSection />
	<Footer />
</div>
