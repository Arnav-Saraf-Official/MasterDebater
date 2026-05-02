<script lang="ts">
	import AnimateOnScroll from '$lib/components/AnimateOnScroll.svelte';
	import { Info } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About | MasterDebater</title>
</svelte:head>

<section class="flex min-h-[50vh] flex-col justify-center py-section">
	<div class="mx-auto w-full max-w-[80vw]">
		<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
			<div
				class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase"
			>
				<Info size={14} /> About The Project
			</div>
			<h1 class="mt-6 font-heading text-5xl font-medium text-foreground md:text-7xl">
				MasterDebater
			</h1>
			<p class="mt-6 max-w-2xl text-lg leading-relaxed text-secondary md:text-xl">
				The ultimate companion for structured debate. Built for precision, performance, and
				completely offline use.
			</p>
		</AnimateOnScroll>
	</div>
</section>

<section class="px-6 pb-section md:px-12">
	<div class="mx-auto w-full max-w-[80vw] rounded-2xl bg-accent/40 p-5">
		<AnimateOnScroll animation="animate-fade-in-up" stagger={2}>
			<article
				class="prose prose-lg max-w-3xl prose-headings:font-heading prose-headings:font-medium prose-headings:text-foreground prose-p:text-secondary prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground prose-li:text-secondary"
			>
				<h2>Our Mission</h2>
				<p>
					MasterDebater was built to solve a simple problem: managing structured debates shouldn't
					be harder than the debate itself. We provide the tools you need to research, organize, and
					execute flawless arguments without relying on scattered notes or clunky spreadsheets.
				</p>

				<h2>Core Principles</h2>
				<ul>
					<li>
						<strong>Precision:</strong> Every feature is designed with exactness in mind. From timer management
						to argument structuring, we leave no room for error.
					</li>
					<li>
						<strong>Performance:</strong> Built to be fast, reliable, and completely offline-capable.
						Your debate prep is available whenever you need it, instantly.
					</li>
					<li>
						<strong>Innovation:</strong> Constantly iterating to provide debaters with modern tools that
						adapt to the evolving landscape of competitive debate.
					</li>
				</ul>

				<h2>Meet the Creator</h2>
				<p>
					MasterDebater is developed and maintained by <strong>Arnav Saraf</strong>. Driven by a
					passion for AI models and his experience with debate, he created MasterDebater to help new
					members get started with debate quickly.
				</p>
				<p>
					We believe that the best tools are built collaboratively. If you'd like to explore how
					MasterDebater works under the hood or contribute to its development, you can view the
					source code and documentation on
					<a
						href="https://github.com/Arnav-Saraf-Official/MasterDebater"
						target="_blank"
						rel="noopener noreferrer">GitHub</a
					>. Please read the lisence before viewing or contributing to the project.
				</p>
			</article>
		</AnimateOnScroll>
	</div>
</section>
