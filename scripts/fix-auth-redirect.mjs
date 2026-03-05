/**
 * Fix Supabase Auth redirect — production redirects to localhost
 *
 * Updates Supabase project auth config:
 *   - Site URL: https://plusto-1.vercel.app
 *   - Redirect URLs: production + localhost (5173, 5177)
 *
 * Requires Supabase Personal Access Token (NOT service role key).
 * Get token: https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   node scripts/fix-auth-redirect.mjs --token <YOUR_PAT>
 *   SUPABASE_ACCESS_TOKEN=<pat> node scripts/fix-auth-redirect.mjs
 */
const PROJECT_REF = 'jvvxtgutemwykhhjhqqf';
const tokenArg = process.argv.indexOf('--token');
const accessToken =
  (tokenArg !== -1 ? process.argv[tokenArg + 1] : null) ||
  process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Missing Supabase Personal Access Token.');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/fix-auth-redirect.mjs --token <YOUR_PAT>');
  console.error('  SUPABASE_ACCESS_TOKEN=<pat> node scripts/fix-auth-redirect.mjs');
  console.error('');
  console.error('Get token: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const payload = {
  site_url: 'https://plusto-1.vercel.app',
  uri_allow_list:
    'https://plusto-1.vercel.app/**,http://localhost:5173/**,http://localhost:5177/**,https://*-.vercel.app/**',
};

console.log('Updating Supabase auth config...');
console.log('  site_url:', payload.site_url);
console.log('  uri_allow_list:', payload.uri_allow_list);
console.log('');

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  }
);

if (res.ok) {
  console.log('Auth config updated successfully.');
  console.log('Production OAuth redirects should now go to', payload.site_url);
} else {
  console.error('Failed:', res.status, res.statusText);
  const text = await res.text();
  console.error(text.substring(0, 500));
  process.exit(1);
}
