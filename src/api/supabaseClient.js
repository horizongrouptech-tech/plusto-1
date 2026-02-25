import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        '[supabaseClient] Missing environment variables!\n' +
        'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.\n' +
        'Locally: add them to .env.local\n' +
        'Vercel: add them in Dashboard → Settings → Environment Variables'
    );
}

export const supabase = createClient(
    supabaseUrl  || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        }
    }
);