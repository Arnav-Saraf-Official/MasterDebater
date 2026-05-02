<script lang="ts">
	import AnimateOnScroll from '$lib/components/AnimateOnScroll.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import { FileText, Info } from '@lucide/svelte';

	const tools = [
		{
			name: 'MasterCard',
			description:
				'Tired of cutting and finding content for cards? Let AI do all the heavy lifting so you can focus on what matters more.',
			href: '/tools/mastercard',
			icon: FileText
		}
	];
</script>

<svelte:head>
	<title>Tools | MasterDebater</title>
</svelte:head>

<section class="flex min-h-[50vh] flex-col justify-center py-section">
	<div class="mx-auto w-full max-w-[80vw]">
		<AnimateOnScroll animation="animate-fade-in-up" stagger={1}>
			<div
				class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase"
			>
				<Info size={14} /> Tools and Applications
			</div>
			<h1 class="mt-6 font-heading text-5xl font-medium text-foreground md:text-7xl">
				Tool Library
			</h1>
			<p class="mt-6 max-w-2xl text-lg leading-relaxed text-secondary md:text-xl">
				A collection of specialized tools designed to streamline your debate workflow.
			</p>
		</AnimateOnScroll>
	</div>

	<div class="mx-auto mt-16 w-full max-w-[80vw]">
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each tools as tool}
				<FeatureCard
					title={tool.name}
					description={tool.description}
					href={tool.href}
					icon={tool.icon}
				/>
			{/each}
		</div>
	</div>
</section>
