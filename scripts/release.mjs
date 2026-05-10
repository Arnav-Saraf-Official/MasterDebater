import 'dotenv/config';
import { execSync } from 'child_process';

const type = process.argv[2];

if (!type) {
	console.error('Missing version type (patch | minor | major)');
	process.exit(1);
}

const isPre = type.startsWith('pre');

try {
	console.log(`\n📦 Bumping version: ${type}\n`);

	const versionArg = isPre ? `${type} --preid=beta` : type;
	execSync(`npm version ${versionArg}`, { stdio: 'inherit' });

	console.log('\nBuilding Windows Electron app...\n');

	if (!process.env.GH_TOKEN) {
		throw new Error('Missing GH_TOKEN in environment (.env)');
	}

	execSync(`cross-env GH_TOKEN=${process.env.GH_TOKEN} npm run build:win-release`, {
		stdio: 'inherit'
	});

	console.log('\n✅ Release complete\n');
} catch (err) {
	console.error('\n❌ Release failed\n');
	console.error(err);
	process.exit(1);
}
