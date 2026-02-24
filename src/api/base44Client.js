/**
 * base44Client.js — compatibility shim (Step 7 of migration)
 *
 * The @base44/sdk is no longer initialized. All call sites continue to work:
 *   - base44.entities.*   → Supabase-backed (Step 4)
 *   - base44.functions.invoke() → proxied to /api/<name> (Step 6, in progress)
 *   - base44.auth.me()    → returns null (all calls replaced in Step 7)
 *   - base44.auth.logout()→ Supabase signOut
 */
import * as entities from './entities';
import { supabase } from './supabaseClient';

const functions = {
  invoke: async (name, params = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        console.warn(`[base44.functions.invoke] ${name} failed:`, err);
        return { data: null, error: err };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (e) {
      console.warn(`[base44.functions.invoke] ${name} error:`, e.message);
      return { data: null, error: e.message };
    }
  },
};

const auth = {
  me: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return data ?? null;
  },
  logout: async () => {
    await supabase.auth.signOut();
    window.location.href = '/Welcome';
  },
};

export const base44 = {
  entities,
  functions,
  auth,
};
