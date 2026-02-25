#!/usr/bin/env node
/**
 * scripts/remove-base44.js
 *
 * Codemod: replaces all `base44.*` call-site patterns with direct imports.
 *
 * Run: node scripts/remove-base44.js
 *
 * What it does per file:
 *  1. Removes `import { base44 } from '@/api/base44Client'`
 *  2. Replaces base44.entities.X.  → X.   and collects X for import
 *  3. Replaces base44.asServiceRole.entities.X.  → X.  (same entity import)
 *  4. Replaces base44.integrations.Core.X(  → X(  and collects X for import
 *  5. Replaces base44.functions.invoke('name', p)  → name(p)
 *  6. Replaces base44.agents.method  → agents.method  + import * as agents
 *  7. Replaces base44.appLogs.*  → silent no-op (removes the call)
 *  8. Handles ExportData.jsx special case: base44.entities[dynVar]
 *  9. Injects the necessary import lines after the last existing import
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');

// ── Known exported names ───────────────────────────────────────────────────────

const ENTITY_NAMES = new Set([
  'User','OnboardingRequest','CustomerContact','CustomerAction',
  'CustomerGoal','GoalTemplate','GoalComment',
  'Recommendation','RecommendationRating','RecommendationFeedback','RecommendationSuggestion',
  'FileUpload','FileCategory','TempUpload','UnknownFileQueue',
  'Supplier','SupplierQuote','SupplierPayment','SupplierOrder',
  'Product','ProductCatalog','Catalog','CatalogMappingProfile','ExperientialProduct','Promotion',
  'Sale','CashFlow','RecurringExpense','PurchaseRecord','FinancialReport',
  'FinancialManagerPerformance','DashboardStats',
  'BusinessForecast','ManualForecast','ManualForecastSheet','ManualForecastRow',
  'ManualForecastMappingProfile','ManualForecastVersion','ProjectForecast','ZReportDetails',
  'BusinessMove','StrategicMove','StrategicPlanInput','ProcessStatus',
  'UserActivity','UserEngagement','WebsiteScanResult',
  'Lead','LeadCommission',
  'Meeting','MeetingSummary','CommunicationThread','ChatMessage',
  'ManagerConversation','ManagerMessage',
  'Notification','CustomerNotification',
  'OrganizationChart','Department',
  'SupportTicket','AgentSupportTicket','ServiceContact',
  'SystemCredential','SystemSettings',
  'Ofek360Model','DailyChecklist360','BackupLog','GoalBankItem',
]);

const INTEGRATION_NAMES = new Set([
  'InvokeLLM','UploadFile','ExtractDataFromUploadedFile','GenerateImage','SendEmail','SendSMS',
]);

// ── Helpers ────────────────────────────────────────────────────────────────────

function findJsxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsxFiles(full));
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) results.push(full);
  }
  return results;
}

function findLastImportLine(lines) {
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i].trim())) last = i;
  }
  return last;
}

// ── Main transform ─────────────────────────────────────────────────────────────

function transform(filePath, src) {
  // Only process files that import from base44Client
  if (!src.includes('base44Client')) return null;

  let out = src;
  const usedEntities    = new Set();
  const usedIntegrations = new Set();
  const usedFunctions   = new Set();
  let   usesAgents      = false;
  let   usesDynEntity   = false; // base44.entities[dynVar]

  // ── A. Collect & replace base44.asServiceRole.entities.X.  ──────────────────
  out = out.replace(/base44\.asServiceRole\.entities\.(\w+)\./g, (_, name) => {
    if (ENTITY_NAMES.has(name)) usedEntities.add(name);
    return `${name}.`;
  });

  // ── B. Detect dynamic entity access: base44.entities[  ──────────────────────
  if (/base44\.entities\[/.test(out)) {
    usesDynEntity = true;
    out = out.replace(/base44\.entities\[/g, 'AllEntities[');
  }

  // ── C. Collect & replace base44.entities.X.  ────────────────────────────────
  out = out.replace(/base44\.entities\.(\w+)\./g, (_, name) => {
    if (ENTITY_NAMES.has(name)) usedEntities.add(name);
    return `${name}.`;
  });

  // ── D. Collect & replace base44.integrations.Core.X(  ───────────────────────
  out = out.replace(/base44\.integrations\.Core\.(\w+)\(/g, (_, name) => {
    if (INTEGRATION_NAMES.has(name)) usedIntegrations.add(name);
    return `${name}(`;
  });
  // Also: base44.integrations.Core.X without parens (e.g. passing as ref)
  out = out.replace(/base44\.integrations\.Core\.(\w+)/g, (_, name) => {
    if (INTEGRATION_NAMES.has(name)) usedIntegrations.add(name);
    return name;
  });

  // ── E. Replace base44.functions.invoke('name', params)  ─────────────────────
  // Pattern: base44.functions.invoke('name', rest  →  name(rest
  out = out.replace(/base44\.functions\.invoke\('(\w+)',\s*/g, (_, name) => {
    usedFunctions.add(name);
    return `${name}(`;
  });
  // Pattern: base44.functions.invoke('name')  →  name()
  out = out.replace(/base44\.functions\.invoke\('(\w+)'\)/g, (_, name) => {
    usedFunctions.add(name);
    return `${name}()`;
  });

  // ── F. Replace base44.agents.  ───────────────────────────────────────────────
  if (out.includes('base44.agents.')) {
    usesAgents = true;
    out = out.replace(/base44\.agents\./g, 'agents.');
  }

  // ── G. Remove base44.appLogs calls (they are no-ops)  ───────────────────────
  // Remove: base44.appLogs.logUserInApp(expr).catch(() => { ... });
  out = out.replace(/base44\.appLogs\.\w+\([^)]*\)(?:\.catch\([^)]*\))?;?/g, '');

  // ── H. Remove the base44 import line  ────────────────────────────────────────
  out = out.replace(/^import\s+\{\s*base44\s*\}\s+from\s+['"]@\/api\/base44Client['"];?\n?/m, '');

  // ── H2. Consolidate old @/functions/name style imports  ──────────────────────
  // These also resolve to src/api/functions.js via vite alias — collect & remove them.
  out = out.replace(
    /^import\s+\{([^}]+)\}\s+from\s+['"]@\/functions\/\w+['"];?\n?/gm,
    (_, names) => {
      names.split(',').map(s => s.trim()).filter(Boolean).forEach(n => usedFunctions.add(n));
      return '';
    }
  );

  // ── H3. Consolidate old @/entities/name style imports  ───────────────────────
  out = out.replace(
    /^import\s+\{([^}]+)\}\s+from\s+['"]@\/entities\/\w+['"];?\n?/gm,
    (_, names) => {
      names.split(',').map(s => s.trim()).filter(Boolean).forEach(n => usedEntities.add(n));
      return '';
    }
  );

  // ── I. Build new import lines  ────────────────────────────────────────────────
  const newImports = [];

  if (usesDynEntity) {
    newImports.push(`import * as AllEntities from '@/api/entities';`);
  }
  if (usedEntities.size > 0) {
    const sorted = [...usedEntities].sort();
    newImports.push(`import { ${sorted.join(', ')} } from '@/api/entities';`);
  }
  if (usedIntegrations.size > 0) {
    const sorted = [...usedIntegrations].sort();
    newImports.push(`import { ${sorted.join(', ')} } from '@/api/integrations';`);
  }
  if (usedFunctions.size > 0) {
    const sorted = [...usedFunctions].sort();
    newImports.push(`import { ${sorted.join(', ')} } from '@/api/functions';`);
  }
  if (usesAgents) {
    newImports.push(`import * as agents from '@/api/agents';`);
  }

  if (newImports.length === 0) return out;

  // Insert after last import line
  const lines = out.split('\n');
  const lastImport = findLastImportLine(lines);
  const insertAt = lastImport >= 0 ? lastImport + 1 : 0;
  lines.splice(insertAt, 0, ...newImports);
  return lines.join('\n');
}

// ── Run ────────────────────────────────────────────────────────────────────────

const files = findJsxFiles(SRC);
let changed = 0;
let skipped = 0;

for (const filePath of files) {
  const src = fs.readFileSync(filePath, 'utf8');
  const result = transform(filePath, src);
  if (result === null || result === src) {
    skipped++;
    continue;
  }
  fs.writeFileSync(filePath, result, 'utf8');
  console.log(`✓ ${path.relative(SRC, filePath)}`);
  changed++;
}

console.log(`\nDone: ${changed} files transformed, ${skipped} skipped.`);
