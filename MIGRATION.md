# Migration Guide: Base44 → Supabase + Vercel

Assumes: Supabase project created, Vercel project connected to this repo, env vars set.

---

## ~~Step 1 — Create the database schema~~ ✅ Done

---

## Step 2 — Set up the Supabase client + profiles table

### 2a. Add the profiles table and auto-create trigger

Supabase's `auth.users` table is internal and not directly queryable. You need a `profiles` table that mirrors your Base44 `User` entity and a trigger to populate it on signup.

Run this in the Supabase SQL Editor:

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  user_type TEXT CHECK (user_type IN ('regular', 'financial_manager', 'supplier_user')),
  is_approved_by_admin BOOLEAN DEFAULT FALSE,
  business_name TEXT,
  business_type TEXT,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Auto-create a profile row every time someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2b. Configure the Supabase client

**`src/api/supabaseClient.js`**:
```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    }
  }
);
```

---

## Step 3 — Replace authentication

### 3a. Rewrite AuthContext

**`src/lib/AuthContext.jsx`** — replace the entire file:

```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserProfile(session.user.id);
      else setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) await loadUserProfile(session.user.id);
      else { setUser(null); setIsLoadingAuth(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setUser(data ?? null);
    setIsLoadingAuth(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/Welcome';
  };

  const navigateToLogin = () => { window.location.href = '/Welcome'; };
  const checkAppState = () => ({ isAuthenticated: !!user });
  const refreshUser = async () => { if (user) await loadUserProfile(user.id); };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, logout, navigateToLogin, checkAppState, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### 3b. Replace auth calls in Layout.jsx

| Old (Base44) | New (Supabase) |
|---|---|
| `base44.auth.me()` | `supabase.auth.getUser()` + query `profiles` by `id` |
| `base44.auth.logout()` | `supabase.auth.signOut()` |
| `base44.entities.User.update(id, data)` | `supabase.from('profiles').update(data).eq('id', id)` |
| `base44.entities.Notification.filter(...)` | `supabase.from('notifications').select('*').match(...)` |

### 3c. Update Welcome.jsx

Replace the Base44 login redirect with a real login/signup form:

```jsx
const handleLogin = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) setError(error.message);
};

const handleSignup = async (email, password, fullName) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) setError(error.message);
};
```

---

## Step 4 — Replace the entity layer

Rewrite **`src/api/entities.js`** so every call site keeps working with zero changes. The function signatures stay identical to Base44.

```js
import { supabase } from './supabaseClient';

function toSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function applySort(query, sortBy) {
  if (!sortBy) return query;
  const desc = sortBy.startsWith('-');
  return query.order(sortBy.replace(/^-/, ''), { ascending: !desc });
}

function createEntity(tableName) {
  return {
    filter: async (filters = {}, sortBy = null, limit = null) => {
      let q = supabase.from(tableName).select('*').match(filters);
      q = applySort(q, sortBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    list: async (sortBy = '-created_date', limit = null) => {
      let q = supabase.from(tableName).select('*');
      q = applySort(q, sortBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    get: async (id) => {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    create: async (data) => {
      const { data: result, error } = await supabase.from(tableName).insert(data).select().single();
      if (error) throw error;
      return result;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
    bulkCreate: async (arr) => {
      const { data, error } = await supabase.from(tableName).insert(arr).select();
      if (error) throw error;
      return data;
    },
  };
}

export const User                         = createEntity('profiles');  // note: profiles, not users
export const CustomerGoal                 = createEntity('customer_goals');
export const FileUpload                   = createEntity('file_uploads');
export const BusinessForecast             = createEntity('business_forecasts');
// ... one export per table (63 total)
```

> **Note:** `User` maps to `profiles`, not `auth.users`.

---

## Step 5 — Replace integrations (email, LLM, SMS, file upload)

### 5a. Create the Vercel API routes

Create one file per integration under `api/integrations/`. Every route must first verify the JWT:

```ts
// api/integrations/_auth.ts  — shared helper
import { createClient } from '@supabase/supabase-js';

export async function requireAuth(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return user;
}
```

Routes to create:
- `api/integrations/invoke-llm.ts` → calls OpenAI `chat.completions.create()`
- `api/integrations/send-email.ts` → calls Resend `emails.send()`
- `api/integrations/send-sms.ts` → calls Twilio REST
- `api/integrations/upload-file.ts` → uploads to Supabase Storage, returns `{ file_url }`
- `api/integrations/generate-image.ts` → calls OpenAI `images.generate()`
- `api/integrations/extract-data.ts` → calls OpenAI with file content + schema

### 5b. Rewrite src/api/integrations.js

Export names stay identical — zero changes needed at call sites:

```js
import { supabase } from './supabaseClient';

const apiCall = async (path, params) => {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(params),
  }).then(r => r.json());
};

export const InvokeLLM                   = (p) => apiCall('/api/integrations/invoke-llm', p);
export const SendEmail                   = (p) => apiCall('/api/integrations/send-email', p);
export const SendSMS                     = (p) => apiCall('/api/integrations/send-sms', p);
export const UploadFile                  = (p) => apiCall('/api/integrations/upload-file', p);
export const GenerateImage               = (p) => apiCall('/api/integrations/generate-image', p);
export const ExtractDataFromUploadedFile = (p) => apiCall('/api/integrations/extract-data', p);
export const Core = { InvokeLLM, SendEmail, SendSMS, UploadFile, GenerateImage, ExtractDataFromUploadedFile };
```

---

## ~~Step 6 — Migrate the 89 backend functions~~ ✅ Done

Convert every file in `functions/` (Deno) to `api/` (Node.js). The conversion is mostly mechanical:

| Deno | Node.js / Vercel |
|---|---|
| `Deno.serve(async (req) => {` | `export default async function handler(req, res) {` |
| `Deno.env.get('KEY')` | `process.env.KEY` |
| `import { X } from 'npm:pkg'` | `import { X } from 'pkg'` |
| `return new Response(JSON.stringify(data), { status: 200 })` | `res.status(200).json(data)` |
| `createClientFromRequest(req)` | see auth helper above |
| `base44.asServiceRole.entities.X.list()` | admin client with `SUPABASE_SERVICE_ROLE_KEY` |

**Admin-only function pattern:**
```ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // bypasses RLS — backend only!
);

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const supabaseUser = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabaseUser.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  // safe to use supabaseAdmin here
  const { data } = await supabaseAdmin.from('some_table').select('*');
  return res.status(200).json({ data });
}
```

Do these in batches by feature area (forecasting, onboarding, catalog, CRM, WhatsApp, backups).

---

## Step 7 — Update all components and pages

After Steps 3–5 are done, most call sites already work. Find what's left:

```bash
grep -r "base44" src/ --include="*.jsx" --include="*.js" --include="*.tsx"
```

Remaining patterns to fix:

- `base44.functions.invoke('functionName', params)` → `fetch('/api/functionName', { method: 'POST', body: JSON.stringify(params) })`
- `base44.agents.subscribeToConversation(id, cb)` → Supabase Realtime:

```js
const channel = supabase.channel(`conv:${id}`)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public',
    table: 'manager_messages',
    filter: `conversation_id=eq.${id}`,
  }, cb)
  .subscribe();
// cleanup: supabase.removeChannel(channel)
```

---

## Step 8 — Clean up

Once the grep returns zero results:

1. Delete `src/api/base44Client.js`
2. Delete `src/lib/app-params.js`
3. Remove `<VisualEditAgent />` from `src/App.jsx` and delete `src/lib/VisualEditAgent.jsx`
4. Delete the `base44/` directory
5. Delete the `functions/` directory
6. Run `npm uninstall @base44/sdk @base44/vite-plugin`
7. Remove `@base44/vite-plugin` from `vite.config.js`

---

## Step 9 — Data migration (one-time)

1. Export all data from Base44 (admin export or API dump → JSON)
2. Transform: convert timestamps to ISO 8601, map IDs to UUIDs, keep nested objects as JSONB
3. Import into Supabase using the service role key:
```js
const supabaseAdmin = createClient(url, serviceRoleKey);
for (const [table, rows] of Object.entries(exportedData)) {
  await supabaseAdmin.from(table).insert(rows);
}
```
4. Verify row counts match
5. Deploy to staging, run smoke tests, then cut over production

---

## Environment variables

```
# Frontend (Vite — prefix with VITE_ to expose to browser)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...         # safe to expose

# Backend (Vercel Functions only — never in VITE_ vars!)
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # bypasses RLS, keep secret
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
WOZTELL_AP_KEY=...
WOZTELL_CHANNEL_ID=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BACKUP_BUCKET=plusto-backups
FIREBERRY_API_KEY=...
```
