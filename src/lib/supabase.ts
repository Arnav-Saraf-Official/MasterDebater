import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njvfstduswdwdmyntzow.supabase.co';
const supabaseKey = 'sb_publishable_25apIwJcdMrnMkTqOcZEjg_3NWawQuS';

const isBrowser = typeof window !== 'undefined';

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		flowType: 'pkce',
		persistSession: true,
		detectSessionInUrl: false, // We handle it manually in callback
		storage: isBrowser ? window.localStorage : undefined
	}
});
