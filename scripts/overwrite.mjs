import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';

const GH_OWNER = 'Arnav-Saraf-Official';
const GH_REPO = 'MasterDebater';

function run(cmd) {
	return execSync(cmd, { stdio: 'inherit' });
}

function runSilent(cmd) {
	return execSync(cmd, { stdio: 'pipe' }).toString().trim();
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
		console.log(`\n🗑  Deleting existing GitHub release for ${tag}...\n`);
		await fetch(
			`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/${existing.id}`,
			{ method: 'DELETE', headers }
		);
	}
}

try {
	console.log('\n🔍 Checking git state...\n');

	run('git rev-parse --is-inside-work-tree');

	const status = runSilent('git status --porcelain');

	if (status.length > 0) {
		console.error('❌ Working tree is not clean. Commit or stash changes first.');
		process.exit(1);
	}

	const isRebasing = fs.existsSync('.git/rebase-apply') || fs.existsSync('.git/rebase-merge');

	if (isRebasing) {
		console.error('❌ Rebase or merge in progress. Abort before releasing.');
		process.exit(1);
	}

	if (!process.env.GH_TOKEN) {
		throw new Error('Missing GH_TOKEN in environment (.env)');
	}

	const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
	const version = pkg.version;
	const tag = `v${version}`;

	console.log(`\n🔁 Overwriting release for ${tag} (no version bump)...\n`);

	// Delete local git tag so electron-builder can recreate it
	try {
		runSilent(`git tag -d ${tag}`);
		console.log(`\n🏷  Deleted local git tag ${tag}\n`);
	} catch {
		console.log(`\n⚠  Local tag ${tag} not found, skipping delete\n`);
	}

	// Delete remote git tag
	try {
		runSilent(`git push origin :refs/tags/${tag}`);
		console.log(`\n🏷  Deleted remote git tag ${tag}\n`);
	} catch {
		console.log(`\n⚠  Remote tag ${tag} not found, skipping delete\n`);
	}

	await deleteGitHubRelease(version, process.env.GH_TOKEN);

	console.log(`\n🚀 Building Windows release v${version}...\n`);

	run(`cross-env GH_TOKEN=${process.env.GH_TOKEN} npm run build:win-release`);

	console.log('\n🌐 Updating web branch...\n');

	run('git checkout web');

	const jsonPath = './static/releases/latest.json';

	fs.writeFileSync(jsonPath, JSON.stringify({ version, date: new Date().toISOString() }, null, 2));

	run('git add .');
	run(`git commit -m "release ${version}"`);
	run('git push');

	console.log('\n🔙 Returning to main...\n');

	run('git checkout main');

	console.log('\n✅ Overwrite complete\n');
} catch (err) {
	console.error('\n❌ Overwrite failed\n');
	console.error(err);
	process.exit(1);
}
