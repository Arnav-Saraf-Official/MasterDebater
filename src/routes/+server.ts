import { json } from '@sveltejs/kit';

let loggedIn = false;

function setLoggedIn(value: boolean) {
	loggedIn = value;
}

function getLoggedIn() {
	return loggedIn;
}

export const POST = async ({ request }) => {
	const { status } = await request.json();
	setLoggedIn(status);
	return json({ success: true, loggedIn });
};

export const GET = async () => {
	return json({ loggedIn: getLoggedIn() });
};

export { setLoggedIn, getLoggedIn };
