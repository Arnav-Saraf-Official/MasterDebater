<script lang="ts">
	import AnimateOnScroll from './AnimateOnScroll.svelte';

	interface Props {
		icon: string;
		title: string;
		description: string;
		stagger?: number;
	}

	let { icon, title, description, stagger = 1 }: Props = $props();
</script>

<AnimateOnScroll {stagger}>
	<div class="hover-lift press-feedback rounded-xl bg-card p-6 shadow-sm ring-1 ring-border transition-shadow">
		<div class="mb-3 text-3xl leading-none">{icon}</div>
		<h3 class="font-heading text-right text-xl font-medium text-foreground">{title}</h3>
		<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
	</div>
</AnimateOnScroll>
