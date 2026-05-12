import 'dotenv/config';
import { execSync } from 'child_process';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import fs from 'fs';

const c = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
	gray: '\x1b[90m',
};
const info = (msg) => console.log(`${c.cyan}${msg}${c.reset}`);
const success = (msg) => console.log(`${c.green}${msg}${c.reset}`);
const warn = (msg) => console.log(`${c.yellow}${msg}${c.reset}`);
const error = (msg) => console.error(`${c.red}${msg}${c.reset}`);

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
		console.log('  invalid choice, try again.');
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
		info(`\ndeleting existing github release for ${tag}...`);
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
		error('\nworking tree is not clean. commit or stash changes first.');
		process.exit(1);
	}

	if (fs.existsSync('.git/rebase-apply') || fs.existsSync('.git/rebase-merge')) {
		error('\nrebase or merge in progress. abort before releasing.');
		process.exit(1);
	}

	if (!process.env.GH_TOKEN) throw new Error('missing GH_TOKEN in .env');

	const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
	info(`\ncurrent version: ${pkg.version}`);

	const platform = argPlatform ?? (await pick(rl, 'target platform?', PLATFORMS));

	let version;

	if (argOverwrite || (!argBump && !interactive && !argOverwrite)) {
		version = pkg.version;
	} else if (!argBump) {
		const modeChoice = await pick(rl, 'what do you want to do?', [
			'bump & release',
			'overwrite current version'
		]);
		if (modeChoice === 'overwrite current version') {
			version = pkg.version;
		} else {
			const bumpChoice = await pick(rl, 'version bump type?', BUMP_TYPES);
			argBump = bumpChoice;
		}
	}

	if (argBump) {
		const versionArg = BUMP_MAP[argBump] ?? argBump;
		info('\nbumping version...');
		run(`npm version ${versionArg}`);
		const bumped = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
		version = bumped.version;
	}

	if (!argBump || argOverwrite) {
		const tag = `v${version}`;
		info(`\noverwriting ${tag} on ${platform}...`);
		try {
			runSilent(`git tag -d ${tag}`);
			info(`deleted local tag ${tag}`);
		} catch {
			warn(`local tag ${tag} not found, skipping`);
		}
		try {
			runSilent(`git push origin :refs/tags/${tag}`);
			info(`deleted remote tag ${tag}`);
		} catch {
			warn(`remote tag ${tag} not found, skipping`);
		}
	}

	rl.close();

	await deleteGitHubRelease(version, process.env.GH_TOKEN);

	info(`\nbuilding ${platform} release v${version}...`);
	run(`cross-env GH_TOKEN=${process.env.GH_TOKEN} npm run build:${platform}-release`);

	info('\nupdating web branch...');
	run('git checkout web');
	fs.writeFileSync(
		'./static/releases/latest.json',
		JSON.stringify({ version, date: new Date().toISOString() }, null, 2)
	);
	run('git add .');
	run(`git commit -m "release ${version}"`);
	run('git push');

	info('\nreturning to main...');
	run('git checkout main');

	success('\nrelease complete\n');
} catch (err) {
	rl.close();
	error('\nrelease failed\n');
	console.error(err);
	process.exit(1);
}