/**
 * _helpers.js — shared utilities for all Vercel API routes (Step 6 of migration)
 *
 * Provides:
 *   - supabaseAdmin    : service-role client (bypasses RLS)
 *   - supabaseUser(tok): user-scoped client
 *   - requireAuth      : verifies Supabase JWT and returns the profile row
 *   - invokeLLM        : calls OpenRouter (replaces base44.integrations.Core.InvokeLLM)
 *   - extractDataFromFile : calls OpenRouter with a file URL (vision)
 *   - entity helpers   : thin wrappers over supabaseAdmin for the patterns used in Deno functions
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ─── Supabase clients ────────────────────────────────────────────────────────

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
);

export function supabaseUser(token) {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Verifies the Bearer token and returns the profile row.
 * On failure sends 401 and returns null.
 */
export async function requireAuth(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const client = supabaseUser(token);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  // Attach profile (role, user_type, etc.)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return profile ?? { id: user.id, email: user.email };
}

// ─── OpenRouter / LLM ─────────────────────────────────────────────────────────

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://plusto-1.vercel.app',
      'X-Title': process.env.SITE_NAME || process.env.VITE_SITE_NAME || 'Plusto',
    },
  });
}

/**
 * Replaces base44.integrations.Core.InvokeLLM / base44.asServiceRole.integrations.Core.InvokeLLM
 *
 * @param {object} opts
 * @param {string}  opts.prompt
 * @param {object}  [opts.response_json_schema]
 * @param {string}  [opts.model]
 * @param {string[]} [opts.file_urls]  — image/file URLs passed as vision messages
 */
export async function invokeLLM({ prompt, response_json_schema, model, file_urls }) {
  const client = getOpenRouterClient();
  const selectedModel = model || process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';

  const messages = [];
  if (response_json_schema) {
    messages.push({
      role: 'system',
      content:
        'You must respond with a valid JSON object that conforms to this schema:\n' +
        JSON.stringify(response_json_schema, null, 2) +
        '\nDo not include any text outside the JSON object.',
    });
  }

  // Build user content (text + optional file URLs for vision)
  let userContent;
  if (file_urls && file_urls.length > 0) {
    userContent = [
      { type: 'text', text: prompt },
      ...file_urls.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
  } else {
    userContent = prompt;
  }
  messages.push({ role: 'user', content: userContent });

  const requestParams = { model: selectedModel, messages };
  if (response_json_schema) requestParams.response_format = { type: 'json_object' };

  const completion = await client.chat.completions.create(requestParams);
  const content = completion.choices[0].message.content;

  if (response_json_schema) {
    try {
      return JSON.parse(content);
    } catch {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { result: content }; }
    }
  }
  return content;
}

/**
 * Replaces base44.integrations.Core.ExtractDataFromUploadedFile
 */
export async function extractDataFromFile({ file_url, json_schema }) {
  const result = await invokeLLM({
    prompt: 'Extract all structured data from this file according to the provided JSON schema. Return only valid JSON.',
    response_json_schema: json_schema,
    file_urls: [file_url],
    model: 'openai/gpt-4o',
  });
  return { status: 'success', output: result };
}

// ─── Entity helpers (thin Supabase wrappers matching Base44 patterns) ─────────

/** Converts camelCase entity name → snake_case table name */
function toTable(entityName) {
  // Special cases
  const overrides = {
    User: 'profiles',
    CustomerGoal: 'customer_goal',
    OnboardingRequest: 'onboarding_request',
    CustomerContact: 'customer_contact',
    Recommendation: 'recommendation',
    CustomerAction: 'customer_action',
    FileUpload: 'file_upload',
    PurchaseRecord: 'purchase_record',
    BusinessForecast: 'business_forecast',
    StrategicPlanInput: 'strategic_plan_input',
    FinancialManagerPerformance: 'financial_manager_performance',
    ProcessStatus: 'process_status',
    Catalog: 'catalog',
    Product: 'product',
    Supplier: 'supplier',
    Meeting: 'meeting',
  };
  if (overrides[entityName]) return overrides[entityName];
  return entityName
    .replace(/([A-Z])/g, (m, l, o) => (o > 0 ? '_' : '') + l.toLowerCase());
}

export function entity(entityName) {
  const table = toTable(entityName);
  return {
    async list() {
      const { data, error } = await supabaseAdmin.from(table).select('*');
      if (error) throw new Error(error.message);
      return data;
    },
    async filter(filters) {
      let q = supabaseAdmin.from(table).select('*');
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
    async get(id) {
      const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return data;
    },
    async create(payload) {
      const { data, error } = await supabaseAdmin.from(table).insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async update(id, payload) {
      const { data, error } = await supabaseAdmin.from(table).update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async delete(id) {
      const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    async bulkCreate(rows) {
      const { data, error } = await supabaseAdmin.from(table).insert(rows).select();
      if (error) throw new Error(error.message);
      return data;
    },
  };
}
