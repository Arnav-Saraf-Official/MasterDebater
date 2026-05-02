<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		animation?: string;
		stagger?: number;
		threshold?: number;
		children: import('svelte').Snippet;
		[key: string]: unknown;
	}

	let { animation = 'animate-fade-in-up', stagger = 1, threshold = 0.15, children, ...rest }: Props = $props();

	let element: HTMLElement | undefined = $state();
	let isVisible = $state(false);

	onMount(() => {
		if (!element) return;

		const el = element;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					isVisible = true;
					observer.unobserve(el);
				}
			},
			{ threshold }
		);

		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={element}
	class="{animation} {isVisible ? '' : 'opacity-0'} stagger-{stagger}"
	{...rest}
>
	{@render children()}
</div>
