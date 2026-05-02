<script lang="ts">
	import AnimateOnScroll from './AnimateOnScroll.svelte';

	interface Props {
		icon: any; // Accept Lucide icon component or string
		title: string;
		description: string;
		href?: string;
		stagger?: number;
	}

	let { icon, title, description, href, stagger = 1 }: Props = $props();
</script>

<AnimateOnScroll {stagger}>
	{#if href}
		<a
			{href}
			class="hover-lift press-feedback block rounded-xl bg-card p-6 shadow-sm ring-1 ring-border transition-all hover:shadow-md"
		>
			<div class="mb-4 flex items-center justify-between">
				<div class="text-primary">
					{#if typeof icon === 'string'}
						<span class="text-3xl">{icon}</span>
					{:else}
						{@const Icon = icon}
						<Icon size={32} strokeWidth={1.5} />
					{/if}
				</div>
			</div>
			<h3 class="font-heading text-xl font-medium text-foreground">{title}</h3>
			<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
		</a>
	{:else}
		<div class="hover-lift rounded-xl bg-card p-6 shadow-sm ring-1 ring-border transition-all">
			<div class="mb-4">
				<div class="text-primary">
					{#if typeof icon === 'string'}
						<span class="text-3xl">{icon}</span>
					{:else}
						{@const Icon = icon}
						<Icon size={32} strokeWidth={1.5} />
					{/if}
				</div>
			</div>
			<h3 class="font-heading text-xl font-medium text-foreground">{title}</h3>
			<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
		</div>
	{/if}
</AnimateOnScroll>
