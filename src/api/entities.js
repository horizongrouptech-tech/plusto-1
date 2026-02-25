import { supabase } from './supabaseClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applySort(query, sortBy) {
  if (!sortBy) return query;
  const desc = sortBy.startsWith('-');
  return query.order(sortBy.replace(/^-/, ''), { ascending: !desc });
}

/**
 * Translate Base44-style filter objects into Supabase query calls.
 * Supported operators: $ne, $gt, $gte, $lt, $lte, $in, $like, $ilike
 * Plain values use .eq()
 */
function applyFilters(query, filters = {}) {
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [op, operand] of Object.entries(value)) {
        switch (op) {
          case '$ne':    query = query.neq(key, operand);   break;
          case '$gt':    query = query.gt(key, operand);    break;
          case '$gte':   query = query.gte(key, operand);   break;
          case '$lt':    query = query.lt(key, operand);    break;
          case '$lte':   query = query.lte(key, operand);   break;
          case '$in':    query = query.in(key, operand);    break;
          case '$like':  query = query.like(key, operand);  break;
          case '$ilike': query = query.ilike(key, operand); break;
          default: break;
        }
      }
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

// ---------------------------------------------------------------------------
// Entity factory
// ---------------------------------------------------------------------------

function createEntity(tableName) {
  return {
    /**
     * filter(filters, sortBy, limit)
     * Mimics Base44's .filter() signature exactly.
     */
    filter: async (filters = {}, sortBy = null, limit = null) => {
      let q = supabase.from(tableName).select('*');
      q = applyFilters(q, filters);
      q = applySort(q, sortBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    /**
     * list(sortBy, limit, offset)
     * Base44 callers sometimes pass a third argument (offset) for pagination,
     * e.g. ExportData.jsx: list("-created_date", pageSize, allRecords.length)
     */
    list: async (sortBy = '-created_date', limit = null, offset = null) => {
      let q = supabase.from(tableName).select('*');
      q = applySort(q, sortBy);
      if (offset !== null && offset !== undefined && limit !== null) {
        q = q.range(offset, offset + limit - 1);
      } else if (limit) {
        q = q.limit(limit);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    create: async (recordData) => {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(recordData)
        .select()
        .single();
      if (error) throw error;
      return result;
    },

    update: async (id, recordData) => {
      const { data: result, error } = await supabase
        .from(tableName)
        .update(recordData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    bulkCreate: async (arr) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(arr)
        .select();
      if (error) throw error;
      return data ?? [];
    },
  };
}

// ---------------------------------------------------------------------------
// Entity exports — one per Base44 entity, pointing at the actual Supabase table
// Table names come from scripts/all-tables.sql (generated from the Excel schema).
// ---------------------------------------------------------------------------

// Core / Auth
// User.me() — returns the currently logged-in user's profile row
// profiles table uses created_at (Supabase convention), not created_date (Base44 convention)
const _UserBase = createEntity('profiles');
export const User = {
  ..._UserBase,
  list: (sortBy = '-created_at', limit = null, offset = null) =>
    _UserBase.list(sortBy === '-created_date' ? '-created_at' : sortBy, limit, offset),
  me: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error) throw error;
    return data;
  },
};

// Customers & Onboarding
export const OnboardingRequest             = createEntity('onboarding_request');
export const CustomerContact               = createEntity('customer_contact');
export const CustomerAction                = createEntity('customer_action');

// Goals & Tasks
export const CustomerGoal                  = createEntity('customer_goal');
export const GoalTemplate                  = createEntity('goal_template');
export const GoalComment                   = createEntity('goal_comment');

// Recommendations
export const Recommendation                = createEntity('recommendation');
export const RecommendationRating          = createEntity('recommendation_rating');
export const RecommendationFeedback        = createEntity('recommendation_feedback');
export const RecommendationSuggestion      = createEntity('recommendation_suggestion');

// Files
export const FileUpload                    = createEntity('file_upload');
export const FileCategory                  = createEntity('file_category');
export const TempUpload                    = createEntity('temp_upload');
export const UnknownFileQueue              = createEntity('unknown_file_queue');

// Suppliers
export const Supplier                      = createEntity('supplier');
export const SupplierQuote                 = createEntity('supplier_quote');
export const SupplierPayment               = createEntity('supplier_payment');    // table may not exist yet
export const SupplierOrder                 = createEntity('supplier_order');      // table may not exist yet

// Products & Catalog
export const Product                       = createEntity('products');            // uploaded from CSV
export const ProductCatalog                = createEntity('product_catalog');
export const Catalog                       = createEntity('catalog');
export const CatalogMappingProfile         = createEntity('catalog_mapping_profile');
export const ExperientialProduct           = createEntity('experiential_product');
export const Promotion                     = createEntity('promotion');

// Sales & Finance
export const Sale                          = createEntity('sale');
export const CashFlow                      = createEntity('cash_flow');
export const RecurringExpense              = createEntity('recurring_expense');
export const PurchaseRecord                = createEntity('purchase_record');
export const FinancialReport               = createEntity('financial_report');
export const FinancialManagerPerformance   = createEntity('financial_manager_performance');
export const DashboardStats                = createEntity('dashboard_stats');

// Forecasting
export const BusinessForecast              = createEntity('business_forecast');
export const ManualForecast                = createEntity('manual_forecast');
export const ManualForecastSheet           = createEntity('manual_forecast_sheet');
export const ManualForecastRow             = createEntity('manual_forecast_row');
export const ManualForecastMappingProfile  = createEntity('manual_forecast_mapping_profile');
export const ManualForecastVersion         = createEntity('manual_forecast_version');
export const ProjectForecast               = createEntity('project_forecast');
export const ZReportDetails                = createEntity('z_report_details');

// Business Intelligence
export const BusinessMove                  = createEntity('business_move');
export const StrategicMove                 = createEntity('strategic_move');
export const StrategicPlanInput            = createEntity('strategic_plan_input');
export const ProcessStatus                 = createEntity('process_status');
export const UserActivity                  = createEntity('user_activity');
export const UserEngagement                = createEntity('user_engagement');
export const WebsiteScanResult             = createEntity('website_scan_result');

// Leads
export const Lead                          = createEntity('lead');
export const LeadCommission                = createEntity('lead_commission');

// Meetings & Communication
export const Meeting                       = createEntity('meeting');
export const MeetingSummary                = createEntity('meeting_summary');     // table may not exist yet
export const CommunicationThread           = createEntity('communication_thread');
export const ChatMessage                   = createEntity('chat_message');
export const ManagerConversation           = createEntity('manager_conversation');
export const ManagerMessage                = createEntity('manager_message');

// Notifications
export const Notification                  = createEntity('notification');
export const CustomerNotification          = createEntity('customer_notification');

// Organization
export const OrganizationChart             = createEntity('organization_chart');
export const Department                    = createEntity('department');

// Support & Tickets
export const SupportTicket                 = createEntity('support_ticket');
export const AgentSupportTicket            = createEntity('agent_support_ticket');
export const ServiceContact                = createEntity('service_contact');
export const SystemCredential              = createEntity('system_credential');
export const SystemSettings                = createEntity('system_settings');     // table may not exist yet

// Misc / Internal
export const Ofek360Model                  = createEntity('ofek360_model');
export const DailyChecklist360             = createEntity('daily_checklist360');
export const BackupLog                     = createEntity('backup_log');
export const GoalBankItem                  = createEntity('goal_bank_item');      // fallback for any GoalBank usage
