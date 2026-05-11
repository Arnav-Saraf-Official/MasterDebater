import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';

const type = process.argv[2];

if (!type) {
	console.error('Missing version type (patch | minor | major)');
	process.exit(1);
}

const isPre = type.startsWith('pre');

function run(cmd) {
	return execSync(cmd, { stdio: 'inherit' });
}

function runSilent(cmd) {
	return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

try {
	console.log('\n🔍 Checking git state...\n');

	run('git rev-parse --is-inside-work-tree');

	const status = runSilent('git status --porcelain');

	if (status.length > 0) {
		console.error('❌ Working tree is not clean. Commit or stash changes first.');
		process.exit(1);
	}

	try {
		runSilent('git rev-parse --git-path REBASE_HEAD');
	} catch {}

	const isRebasing = fs.existsSync('.git/rebase-apply') || fs.existsSync('.git/rebase-merge');

	if (isRebasing) {
		console.error('❌ Rebase or merge in progress. Abort before releasing.');
		process.exit(1);
	}

	console.log('\n📦 Bumping version...\n');

	const versionArg = isPre ? `${type} --preid=beta` : type;
	run(`npm version ${versionArg}`);

	// read new version AFTER bump
	const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
	const version = pkg.version;

	console.log(`\n🚀 Building Windows release v${version}...\n`);

	if (!process.env.GH_TOKEN) {
		throw new Error('Missing GH_TOKEN in environment (.env)');
	}

	// build + publish via electron-builder
	run(`cross-env GH_TOKEN=${process.env.GH_TOKEN} npm run build:win-release`);

	console.log('\n🌐 Updating web branch...\n');

	// switch to web branch
	run('git checkout web');

	// update latest.json (adjust path if needed)
	const jsonPath = './static/releases/latest.json';

	const data = {
		version,
		date: new Date().toISOString()
	};

	fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

	run('git add .');
	run(`git commit -m "release ${version}"`);
	run('git push');

	console.log('\n🔙 Returning to main...\n');

	run('git checkout main');

	console.log('\n✅ Release complete\n');
} catch (err) {
	console.error('\n❌ Release failed\n');
	console.error(err);
	process.exit(1);
}
