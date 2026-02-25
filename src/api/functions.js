/**
 * functions.js — client-side wrappers for all server functions (Step 6 of migration).
 *
 * Each function calls the corresponding Vercel API route at /api/<functionName>.
 * As routes are implemented in Step 6, they automatically become available here.
 * Until then, calling an unimplemented function returns { data: null, error: 'not_implemented' }.
 */
import { supabase } from './supabaseClient';

async function invoke(name, params = {}) {
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
      console.warn(`[functions.${name}] failed:`, err);
      return { data: null, error: err };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e) {
    console.warn(`[functions.${name}] error:`, e.message);
    return { data: null, error: e.message };
  }
}

// ── WhatsApp ─────────────────────────────────────────────────────────────────
export const sendWhatsAppMessage          = (p) => invoke('sendWhatsAppMessage', p);
export const initiateWhatsAppConversation = (p) => invoke('initiateWhatsAppConversation', p);

// ── Tasks / CRM ───────────────────────────────────────────────────────────────
export const syncTaskToFireberry          = (p) => invoke('syncTaskToFireberry', p);
export const importFireberryTasks         = (p) => invoke('importFireberryTasks', p);
export const calculateManagerPerformance  = (p) => invoke('calculateManagerPerformance', p);
export const getFinancialManagers         = (p) => invoke('getFinancialManagers', p);
export const approveOnboardingRequest     = (p) => invoke('approveOnboardingRequest', p);
export const autoOnboardingOrchestrator   = (p) => invoke('autoOnboardingOrchestrator', p);

// ── File parsing ──────────────────────────────────────────────────────────────
export const parseXlsx                    = (p) => invoke('parseXlsx', p);
export const processESNAReport            = (p) => invoke('processESNAReport', p);
export const processPurchaseDocument      = (p) => invoke('processPurchaseDocument', p);
export const parseFutureRevenueFile       = (p) => invoke('parseFutureRevenueFile', p);
export const uploadManualForecastXlsx     = (p) => invoke('uploadManualForecastXlsx', p);
export const normalizeAndLoadForecast     = (p) => invoke('normalizeAndLoadForecast', p);
export const requestSupplierQuote         = (p) => invoke('requestSupplierQuote', p);

// ── Catalog ───────────────────────────────────────────────────────────────────
export const processCatalogUpload         = (p) => invoke('processCatalogUpload', p);
export const cleanCatalogSmartly          = (p) => invoke('cleanCatalogSmartly', p);
export const cancelCatalogGeneration      = (p) => invoke('cancelCatalogGeneration', p);
export const generateCatalog              = (p) => invoke('generateCatalog', p);
export const deleteEntireCatalog          = (p) => invoke('deleteEntireCatalog', p);
export const deleteCatalogPermanently     = (p) => invoke('deleteCatalogPermanently', p);
export const exportCatalogToExcel         = (p) => invoke('exportCatalogToExcel', p);

// ── Forecasting / business plan ───────────────────────────────────────────────
export const generateBusinessPlanText     = (p) => invoke('generateBusinessPlanText', p);
export const exportBusinessPlanToPdf      = (p) => invoke('exportBusinessPlanToPdf', p);
export const exportManualForecastToExcel  = (p) => invoke('exportManualForecastToExcel', p);

// ── AI / insights ─────────────────────────────────────────────────────────────
export const generateDeeperInsights       = (p) => invoke('generateDeeperInsights', p);
export const invokeClaude                 = (p) => invoke('invokeClaude', p);
export const deepWebCrawler               = (p) => invoke('deepWebCrawler', p);
