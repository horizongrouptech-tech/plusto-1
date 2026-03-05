-- =============================================================================
-- Fix: Add missing columns to manual_forecast table
-- The table was created with only base columns but the app uses many more fields
-- =============================================================================

-- TEXT columns
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS forecast_name TEXT;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS z_import_error TEXT;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS z_import_timestamp TEXT;

-- NUMERIC columns
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS forecast_year NUMERIC;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS start_month NUMERIC;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS end_month NUMERIC;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS working_days_per_month NUMERIC;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS tax_rate NUMERIC;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS average_cogs_percentage NUMERIC;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS sheet_count NUMERIC;

-- BOOLEAN columns
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS use_aggregate_planning BOOLEAN DEFAULT false;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS z_import_failed BOOLEAN DEFAULT false;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN DEFAULT false;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true;

-- JSONB columns (arrays and complex objects)
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS sales_forecast_onetime JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS global_employees JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS planned_employee_hires JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS marketing_expenses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS admin_expenses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS detailed_expenses JSONB DEFAULT '{"marketing_sales": [], "admin_general": []}'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS financing_loans JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS financing_expenses JSONB DEFAULT '{"monthly_amounts": [0,0,0,0,0,0,0,0,0,0,0,0]}'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS planned_monthly_revenue_aggregate JSONB DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS z_reports_uploaded JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS z_report_product_mapping JSONB DEFAULT '{}'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS profit_loss_monthly JSONB DEFAULT '[]'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}'::jsonb;
ALTER TABLE manual_forecast ADD COLUMN IF NOT EXISTS vat_summary JSONB DEFAULT '{}'::jsonb;
