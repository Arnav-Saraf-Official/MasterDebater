<script lang="ts">
	import { untrack } from 'svelte';

	let { 
		words = ['Arguments', 'Thinking', 'Logic', 'Debates'], 
		typingSpeed = 100, 
		deletingSpeed = 50, 
		pauseDuration = 2000 
	} = $props();

	let currentWordIndex = $state(0);
	let currentText = $state('');
	let isDeleting = $state(false);

	$effect(() => {
		let timeoutId: number;

		function tick() {
			const word = words[currentWordIndex];
			
			if (!isDeleting) {
				// Typing
				currentText = word.substring(0, currentText.length + 1);
				
				if (currentText === word) {
					isDeleting = true;
					timeoutId = setTimeout(tick, pauseDuration);
					return;
				}
			} else {
				// Backspacing
				currentText = word.substring(0, currentText.length - 1);
				
				if (currentText === '') {
					isDeleting = false;
					currentWordIndex = (currentWordIndex + 1) % words.length;
				}
			}

			const speed = isDeleting ? deletingSpeed : typingSpeed;
			timeoutId = setTimeout(tick, speed);
		}

		// Use untrack to start the loop without making the whole effect reactive to the state it changes
		untrack(() => {
			timeoutId = setTimeout(tick, typingSpeed);
		});

		return () => clearTimeout(timeoutId);
	});
</script>

<span class="typewriter">
	{currentText}<span class="cursor">|</span>
</span>

<style>
	.typewriter {
		display: inline-block;
		min-width: 2px;
	}

	.cursor {
		display: inline-block;
		margin-left: 2px;
		color: var(--color-primary);
		animation: blink 1s step-end infinite;
		font-weight: 300;
	}

	@keyframes blink {
		from, to { opacity: 1; }
		50% { opacity: 0; }
	}
</style>
