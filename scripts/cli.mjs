import 'dotenv/config';
import { execSync } from 'child_process';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import fs from 'fs';

const GH_OWNER = 'Arnav-Saraf-Official';
const GH_REPO = 'MasterDebater';

const PLATFORMS = ['win', 'mac', 'linux'];
const BUMP_TYPES = ['beta', 'prepatch', 'patch', 'preminor', 'minor', 'premajor', 'major'];
const BUMP_MAP = { beta: 'prerelease --preid=beta' };

function run(cmd) {
	return execSync(cmd, { stdio: 'inherit' });
}

function runSilent(cmd) {
	return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

async function pick(rl, question, choices) {
	const list = choices.map((c, i) => `  ${i + 1}) ${c}`).join('\n');
	while (true) {
		const ans = await rl.question(`\n${question}\n${list}\n> `);
		const idx = parseInt(ans.trim()) - 1;
		if (idx >= 0 && idx < choices.length) return choices[idx];
		console.log('  Invalid choice, try again.');
	}
}

async function deleteGitHubRelease(version, token) {
	const tag = `v${version}`;
	const headers = {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'masterdebater-release-script'
	};
	const listRes = await fetch(
		`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases?per_page=10`,
		{ headers }
	);
	const releases = await listRes.json();
	const existing = releases.find((r) => r.tag_name === tag);
	if (existing) {
		console.log(`\n🗑  Deleting existing GitHub release for ${tag}...`);
		await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/${existing.id}`, {
			method: 'DELETE',
			headers
		});
	}
}

// --- Parse args ---
// Usage: npm run release -- [platform] [bump-type | overwrite]
// e.g.   npm run release -- mac beta
//        npm run release -- win patch
//        npm run release -- mac overwrite

const args = process.argv.slice(2);
let argPlatform = args.find((a) => PLATFORMS.includes(a));
let argBump = args.find((a) => BUMP_TYPES.includes(a));
let argOverwrite = args.includes('overwrite');
const interactive = !argPlatform && !argBump && !argOverwrite;

const rl = readline.createInterface({ input, output });

try {
	run('git rev-parse --is-inside-work-tree');

	const status = runSilent('git status --porcelain');
	if (status.length > 0) {
		console.error('\n❌ Working tree is not clean. Commit or stash changes first.');
		process.exit(1);
	}

	if (fs.existsSync('.git/rebase-apply') || fs.existsSync('.git/rebase-merge')) {
		console.error('\n❌ Rebase or merge in progress. Abort before releasing.');
		process.exit(1);
	}

	if (!process.env.GH_TOKEN) throw new Error('Missing GH_TOKEN in .env');

	const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
	console.log(`\nCurrent version: ${pkg.version}`);

	const platform = argPlatform ?? (await pick(rl, 'Target platform?', PLATFORMS));

	let version;

	if (argOverwrite || (!argBump && !interactive && !argOverwrite)) {
		// non-interactive with no bump type = overwrite
		version = pkg.version;
	} else if (!argBump) {
		// interactive bump selection
		const modeChoice = await pick(rl, 'What do you want to do?', [
			'Bump & release',
			'Overwrite current version'
		]);
		if (modeChoice === 'Overwrite current version') {
			version = pkg.version;
		} else {
			const bumpChoice = await pick(rl, 'Version bump type?', BUMP_TYPES);
			argBump = bumpChoice;
		}
	}

	if (argBump) {
		const versionArg = BUMP_MAP[argBump] ?? argBump;
		console.log('\n📦 Bumping version...');
		run(`npm version ${versionArg}`);
		const bumped = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
		version = bumped.version;
	}

	if (!argBump || argOverwrite) {
		// overwrite path — delete existing tags
		const tag = `v${version}`;
		console.log(`\n🔁 Overwriting ${tag} on ${platform}...`);
		try {
			runSilent(`git tag -d ${tag}`);
			console.log(`🏷  Deleted local tag ${tag}`);
		} catch {
			console.log(`⚠  Local tag ${tag} not found, skipping`);
		}
		try {
			runSilent(`git push origin :refs/tags/${tag}`);
			console.log(`🏷  Deleted remote tag ${tag}`);
		} catch {
			console.log(`⚠  Remote tag ${tag} not found, skipping`);
		}
	}

	rl.close();

	await deleteGitHubRelease(version, process.env.GH_TOKEN);

	console.log(`\n🚀 Building ${platform} release v${version}...`);
	run(`cross-env GH_TOKEN=${process.env.GH_TOKEN} npm run build:${platform}-release`);

	console.log('\n🌐 Updating web branch...');
	run('git checkout web');
	fs.writeFileSync(
		'./static/releases/latest.json',
		JSON.stringify({ version, date: new Date().toISOString() }, null, 2)
	);
	run('git add .');
	run(`git commit -m "release ${version}"`);
	run('git push');

	console.log('\n🔙 Returning to main...');
	run('git checkout main');

	console.log('\n✅ Release complete\n');
} catch (err) {
	rl.close();
	console.error('\n❌ Release failed\n', err);
	process.exit(1);
}