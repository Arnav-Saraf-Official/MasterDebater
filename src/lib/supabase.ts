import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njvfstduswdwdmyntzow.supabase.co';
const supabaseKey = 'sb_publishable_25apIwJcdMrnMkTqOcZEjg_3NWawQuS';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
	if (!_client) {
		const isBrowser = typeof window !== 'undefined';
		_client = createClient(supabaseUrl, supabaseKey, {
			auth: {
				flowType: 'pkce',
				persistSession: true,
				detectSessionInUrl: false,
				storage: isBrowser ? window.localStorage : undefined
			}
		});
	}
	return _client;
}

// convenience alias
export const supabase = new Proxy({} as SupabaseClient, {
	get(_, prop) {
		return (getSupabase() as never)[prop];
	}
});