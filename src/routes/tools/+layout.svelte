<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	let { children } = $props();
	let checked = $state(false);

	onMount(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (!data.session) {
				goto('/login');
			} else {
				checked = true;
			}
		});

		const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
			if (!session) goto('/login');
		});

		return () => subscription.unsubscribe();
	});
</script>

{#if checked}
	{@render children()}
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
	</div>
{/if}
