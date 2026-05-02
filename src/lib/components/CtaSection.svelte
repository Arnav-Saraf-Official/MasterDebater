<script lang="ts">
	import AnimateOnScroll from './AnimateOnScroll.svelte';
</script>

<section id="cta" class="px-6 py-section md:px-12">
	<div class="mx-auto w-full max-w-[680px] text-center">
		<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
			<h2 class="font-heading text-4xl font-medium text-foreground md:text-5xl">
				Ready to Debate?
			</h2>
		</AnimateOnScroll>

		<AnimateOnScroll animation="animate-fade-in-up" stagger={2}>
			<p class="mt-4 text-lg text-muted-foreground">
				Download MasterDebater and start building stronger arguments today.
			</p>
		</AnimateOnScroll>

		<AnimateOnScroll animation="animate-scale-in" stagger={3}>
			<button
				class="press-feedback mt-8 inline-flex items-center rounded-lg bg-accent px-8 py-4 text-base font-semibold text-on-primary shadow-md transition-all hover:bg-amber-warm-light hover:shadow-lg"
				onclick={() => (window.location.href = '/download')}
			>
				Download for Free
			</button>
		</AnimateOnScroll>
	</div>
</section>
