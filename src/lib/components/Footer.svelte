<script lang="ts">
	import AnimateOnScroll from './AnimateOnScroll.svelte';
</script>

<footer class="border-t border-border px-6 py-8 md:px-12">
	<div
		class="mx-auto flex w-full max-w-[680px] flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row"
	>
		<AnimateOnScroll animation="animate-fade-in" stagger={1}>
			<p>&copy; {new Date().getFullYear()} MasterDebater</p>
		</AnimateOnScroll>

		<AnimateOnScroll animation="animate-fade-in" stagger={2}>
			<nav class="flex gap-6">
				<a href="/privacy" class="transition-colors hover:text-primary">Privacy</a>
				<a href="/terms" class="transition-colors hover:text-primary">Terms</a>
				<a href="/contact" class="transition-colors hover:text-primary">Contact</a>
			</nav>
		</AnimateOnScroll>
	</div>
</footer>
