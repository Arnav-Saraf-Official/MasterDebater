import { execSync } from 'child_process';

export default async function afterPack({ appOutDir }) {
	if (process.platform === 'darwin') {
		execSync(`xattr -cr "${appOutDir}"`, { stdio: 'inherit' });
	}
}
