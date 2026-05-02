<script lang="ts">
	import HeroSection from '$lib/components/HeroSection.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import CtaSection from '$lib/components/CtaSection.svelte';
	import AnimateOnScroll from '$lib/components/AnimateOnScroll.svelte';
</script>

<svelte:head>
	<title>MasterDebater</title>
	<meta
		name="description"
		content="A thoughtful desktop app for structured debate preparation and argument building."
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Navigation — minimal, cream background, right-aligned brand -->
	<HeroSection />

	<!-- Features section -->
	<hr class="mx-auto w-full max-w-[80vw] bg-accent" />
	<section id="features" class="px-6 py-section md:px-12">
		<div class="mx-auto w-full max-w-[80vw] rounded-2xl bg-primary/10 p-10">
			<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
				<h2 class="font-heading text-3xl font-medium text-foreground md:text-4xl">
					Why MasterDebater?
				</h2>
			</AnimateOnScroll>

			<AnimateOnScroll animation="animate-fade-in" stagger={2}>
				<p class="mt-3 text-foreground">Three things that set this tool apart from the rest.</p>
			</AnimateOnScroll>
		</div>
	</section>

	<CtaSection />
</div>
