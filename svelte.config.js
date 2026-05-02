import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Static adapter required for Electron — serves files from disk, not a Node server
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			prerender: 'all',
			strict: true
		})
	}
};

export default config;
