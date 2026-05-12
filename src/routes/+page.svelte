<script lang="ts">
	import HeroSection from '$lib/components/HeroSection.svelte';
	import CtaSection from '$lib/components/CtaSection.svelte';
	import AnimateOnScroll from '$lib/components/AnimateOnScroll.svelte';

	const features = [
		{
			index: '01',
			title: 'Card Cutting',
			description: 'Find, cut, and format evidence in seconds. No more hunting through PDFs at midnight.'
		},
		{
			index: '02',
			title: 'Built for Competitors',
			description: 'Every feature maps to how debaters actually prep — not how a product team imagined it.'
		},
		{
			index: '03',
			title: 'Argument Structure',
			description: 'Generate complete blocks with warrants and impacts. Less logistics, more execution.'
		}
	];
</script>

<svelte:head>
	<title>MasterDebater</title>
	<meta
		name="description"
		content="A thoughtful tool for structured debate preparation and argument building."
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<HeroSection />

	<hr class="mx-auto w-full max-w-[80vw] border-border" />

	<section id="features" class="px-6 py-16 md:px-12">
		<div class="mx-auto w-full max-w-[80vw]">
			<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
				<h2 class="font-heading text-4xl font-medium text-foreground md:text-5xl">
					Why MasterDebater?
				</h2>
			</AnimateOnScroll>

			<div class="mt-12 divide-y divide-border">
				{#each features as feature, i}
					<AnimateOnScroll animation="animate-fade-in-up" stagger={i + 2}>
						<div class="flex gap-12 py-8">
							<span class="w-8 shrink-0 text-sm text-muted-foreground">{feature.index}</span>
							<div class="flex flex-1 flex-col gap-2 md:flex-row md:gap-16">
								<h3 class="w-40 shrink-0 font-heading text-xl font-medium text-foreground">
									{feature.title}
								</h3>
								<p class="text-secondary">{feature.description}</p>
							</div>
						</div>
					</AnimateOnScroll>
				{/each}
			</div>
		</div>
	</section>

	<CtaSection />
</div>
