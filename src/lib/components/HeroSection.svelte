<script lang="ts">
	import AnimateOnScroll from './AnimateOnScroll.svelte';
	import Typewriter from './Typewriter.svelte';
</script>

<section class="flex min-h-[70vh] flex-col justify-center px-6 py-section md:px-12">
	<div class="mx-auto w-full max-w-[80vw]">
		<!-- Overline — subtle, muted, fade-in first -->
		<AnimateOnScroll animation="animate-fade-in" stagger={1}>
			<p class="text-sm font-medium tracking-widest text-accent uppercase">Desktop App</p>
		</AnimateOnScroll>

		<!-- Main heading — right-aligned, Cormorant serif -->
		<AnimateOnScroll animation="animate-fade-in-up" stagger={2}>
			<h1 class="mt-4 font-heading text-5xl leading-tight font-medium text-foreground md:text-7xl">
				MasterDebater
			</h1>
		</AnimateOnScroll>

		<!-- Tagline — left-aligned, Karla body -->
		<AnimateOnScroll animation="animate-fade-in-up" stagger={3}>
			<p class="mt-6 text-lg leading-relaxed text-secondary md:text-xl">
				Sharpen your
				<span class="font-medium text-foreground">
					<Typewriter words={['arguments.', 'persuasion.', 'logic.', 'flows.']} />
				</span>
				<br />
				Use our next-gen tools to take your debate to the next level.
			</p>
		</AnimateOnScroll>

		<!-- CTA buttons -->
		<AnimateOnScroll animation="animate-fade-in-up" stagger={4}>
			<div class="mt-8 flex flex-wrap gap-4">
				<a
					href="#features"
					class="press-feedback inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
				>
					Explore Features
				</a>
				<a
					href="#cta"
					class="press-feedback inline-flex items-center rounded-lg bg-card px-6 py-3 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-cream-200"
				>
					Get Started
				</a>
			</div>
		</AnimateOnScroll>
	</div>
</section>
