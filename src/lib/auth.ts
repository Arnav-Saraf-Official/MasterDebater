import { writable } from 'svelte/store';

// This is for client-side state
export const userSession = writable(null);

// For the "server" state in our local Electron app, 
// we will use the API endpoint we're about to create.
