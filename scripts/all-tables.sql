
-- ============================================
-- Table: product_catalog (from ProductCatalog)
-- ============================================
CREATE TABLE IF NOT EXISTS product_catalog (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  selling_price NUMERIC,
  monthly_sales TEXT,
  profit_percentage NUMERIC,
  gross_profit NUMERIC,
  data_quality TEXT,
  import_errors TEXT,
  inventory TEXT,
  recommendation_date TEXT,
  needs_review BOOLEAN DEFAULT false,
  store_price_alt TEXT,
  sales_revenue TEXT,
  supplier TEXT,
  cost_price_no_vat TEXT,
  barcode TEXT,
  cost_price NUMERIC,
  last_updated TEXT,
  is_active BOOLEAN DEFAULT false,
  is_suggested BOOLEAN DEFAULT false,
  store_price TEXT,
  product_name TEXT,
  data_source TEXT,
  catalog_id TEXT,
  secondary_category TEXT,
  is_recommended BOOLEAN DEFAULT false,
  customer_email TEXT,
  supplier_item_code TEXT,
  missing_fields JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  parent_item_code TEXT,
  suggestion_reasoning TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on product_catalog" ON product_catalog FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: catalog (from Catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS catalog (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  catalog_name TEXT,
  creation_method TEXT,
  is_active BOOLEAN DEFAULT false,
  product_count NUMERIC,
  customer_email TEXT,
  rating TEXT,
  is_default BOOLEAN DEFAULT false,
  generation_metadata TEXT,
  status TEXT,
  last_generated_at TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on catalog" ON catalog FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: onboarding_request (from OnboardingRequest)
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_request (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  business_goals TEXT,
  credit_reports JSONB DEFAULT '[]'::jsonb,
  archived_by TEXT,
  bestselling_products TEXT,
  business_city TEXT,
  additional_assigned_financial_manager_emails JSONB DEFAULT '[]'::jsonb,
  inventory_reports JSONB DEFAULT '[]'::jsonb,
  activity_start_date TEXT,
  competitors TEXT,
  systems TEXT,
  business_type TEXT,
  monthly_revenue NUMERIC,
  credit_card_reports JSONB DEFAULT '[]'::jsonb,
  email TEXT,
  sales_reports JSONB DEFAULT '[]'::jsonb,
  business_name TEXT,
  is_active BOOLEAN DEFAULT false,
  archived_date TEXT,
  unwanted_products TEXT,
  onboarding_status TEXT,
  balance_sheet_reports JSONB DEFAULT '[]'::jsonb,
  bank_statements JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT,
  main_products_services TEXT,
  main_challenges TEXT,
  full_name TEXT,
  admin_notes TEXT,
  customer_group TEXT,
  website_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  phone TEXT,
  profit_loss_reports JSONB DEFAULT '[]'::jsonb,
  activity_end_date TEXT,
  fireberry_account_id TEXT,
  assigned_financial_manager_email TEXT,
  promotions_reports JSONB DEFAULT '[]'::jsonb,
  company_size TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE onboarding_request ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on onboarding_request" ON onboarding_request FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: customer_goal (from CustomerGoal)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_goal (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  end_date TEXT,
  due_time TEXT,
  notes TEXT,
  last_completed_at TEXT,
  fireberry_synced_at TEXT,
  reminder_date TEXT,
  visual_position TEXT,
  next_occurrence_date TEXT,
  success_metrics TEXT,
  day_of_month TEXT,
  is_recurring_active BOOLEAN DEFAULT false,
  end_date_time TEXT,
  assignee_email TEXT,
  specific_days_of_week JSONB DEFAULT '[]'::jsonb,
  start_date TEXT,
  is_active BOOLEAN DEFAULT false,
  related_fireberry_account_id TEXT,
  weight NUMERIC,
  recurrence_end_date TEXT,
  assigned_users JSONB DEFAULT '[]'::jsonb,
  responsible_users JSONB DEFAULT '[]'::jsonb,
  order_index NUMERIC,
  recurrence_count TEXT,
  depends_on_goal_ids JSONB DEFAULT '[]'::jsonb,
  parent_recurring_task_id TEXT,
  times_completed NUMERIC,
  tagged_users JSONB DEFAULT '[]'::jsonb,
  depends_on_goal_id TEXT,
  external_responsible JSONB DEFAULT '[]'::jsonb,
  recurrence_pattern TEXT,
  parent_id TEXT,
  customer_email TEXT,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  name TEXT,
  shape_type TEXT,
  task_type TEXT,
  fireberry_task_id TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE customer_goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on customer_goal" ON customer_goal FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: meeting (from Meeting)
-- ============================================
CREATE TABLE IF NOT EXISTS meeting (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  end_date TEXT,
  transcription_text TEXT,
  recording_url TEXT,
  notes TEXT,
  subject TEXT,
  fireberry_synced_at TEXT,
  channel TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  whatsapp_summary TEXT,
  google_event_id TEXT,
  fireberry_meeting_id TEXT,
  start_date TEXT,
  participants JSONB DEFAULT '[]'::jsonb,
  decisions_made JSONB DEFAULT '[]'::jsonb,
  related_fireberry_account_id TEXT,
  end_time TEXT,
  meeting_type TEXT,
  send_reminder BOOLEAN DEFAULT false,
  next_meeting_date TEXT,
  topics_discussed JSONB DEFAULT '[]'::jsonb,
  start_time TEXT,
  location_details TEXT,
  sentiment_analysis TEXT,
  duration_minutes NUMERIC,
  ai_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  customer_email TEXT,
  participant_names JSONB DEFAULT '[]'::jsonb,
  location TEXT,
  invite_customer BOOLEAN DEFAULT false,
  manager_email TEXT,
  meeting_date TEXT,
  status TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE meeting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on meeting" ON meeting FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: recommendation (from Recommendation)
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  affected_products JSONB DEFAULT '[]'::jsonb,
  impact_recorded BOOLEAN DEFAULT false,
  profit_percentage NUMERIC,
  profit_impact_details TEXT,
  last_upgraded TEXT,
  description TEXT,
  source TEXT,
  recommended_bundle_price TEXT,
  title TEXT,
  expected_profit NUMERIC,
  action_steps JSONB DEFAULT '[]'::jsonb,
  admin_rating TEXT,
  timeframe TEXT,
  actual_financial_impact TEXT,
  related_data TEXT,
  bundle_name_concept TEXT,
  trigger_condition TEXT,
  priority TEXT,
  monthly_targets JSONB DEFAULT '[]'::jsonb,
  impact_recorded_date TEXT,
  last_rated_by_admin_date TEXT,
  individual_items_total_price TEXT,
  required_commitment TEXT,
  roi_timeframe TEXT,
  admin_notes TEXT,
  implementation_effort TEXT,
  customer_email TEXT,
  strategic_move_type TEXT,
  category TEXT,
  published_date TEXT,
  delivery_status TEXT,
  status TEXT,
  affected_product_names JSONB DEFAULT '[]'::jsonb,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE recommendation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on recommendation" ON recommendation FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: file_upload (from FileUpload)
-- ============================================
CREATE TABLE IF NOT EXISTS file_upload (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sync_date TEXT,
  file_url TEXT,
  analysis_notes TEXT,
  products_count NUMERIC,
  data_category TEXT,
  parsing_metadata TEXT,
  filename TEXT,
  extra_ai_insights TEXT,
  is_synced_to_catalog BOOLEAN DEFAULT false,
  esna_report_data TEXT,
  file_type TEXT,
  customer_email TEXT,
  ai_insights TEXT,
  parsed_data JSONB,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE file_upload ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on file_upload" ON file_upload FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: supplier (from Supplier)
-- ============================================
CREATE TABLE IF NOT EXISTS supplier (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  added_by_full_name TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT false,
  contact_person TEXT,
  customer_emails JSONB DEFAULT '[]'::jsonb,
  created_for_customer_email TEXT,
  supplier_type TEXT,
  rating TEXT,
  is_partner_supplier BOOLEAN DEFAULT false,
  last_order_date TEXT,
  delivery_time TEXT,
  source TEXT,
  payment_terms TEXT,
  supplier_user_email TEXT,
  website_url TEXT,
  phone TEXT,
  name TEXT,
  min_order NUMERIC,
  category TEXT,
  email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on supplier" ON supplier FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: supplier_quote (from SupplierQuote)
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_quote (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_id TEXT,
  supplier_name TEXT,
  product_name TEXT,
  unit_price NUMERIC,
  minimum_quantity NUMERIC,
  delivery_time TEXT,
  quality_grade TEXT,
  payment_terms TEXT,
  quote_date TEXT,
  valid_until TEXT,
  status TEXT,
  savings_potential NUMERIC,
  savings_percentage NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE supplier_quote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on supplier_quote" ON supplier_quote FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: customer_action (from CustomerAction)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_action (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  action_type TEXT,
  item_id TEXT,
  item_title TEXT,
  item_details JSONB,
  expected_value TEXT,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE customer_action ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on customer_action" ON customer_action FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: dashboard_stats (from DashboardStats)
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_stats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  total_potential_profit NUMERIC,
  last_calculated TEXT,
  recommendations_count NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on dashboard_stats" ON dashboard_stats FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: business_move (from BusinessMove)
-- ============================================
CREATE TABLE IF NOT EXISTS business_move (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timeframe TEXT,
  expected_impact TEXT,
  admin_notes TEXT,
  impact_percentage TEXT,
  customer_email TEXT,
  description TEXT,
  title TEXT,
  category TEXT,
  priority TEXT,
  implementation_complexity TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE business_move ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on business_move" ON business_move FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: customer_notification (from CustomerNotification)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_notification (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  notification_type TEXT,
  title TEXT,
  message TEXT,
  related_item_id TEXT,
  is_read BOOLEAN DEFAULT false,
  read_date TEXT,
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE customer_notification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on customer_notification" ON customer_notification FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: support_ticket (from SupportTicket)
-- ============================================
CREATE TABLE IF NOT EXISTS support_ticket (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject TEXT,
  description TEXT,
  ticket_type TEXT,
  status TEXT,
  priority TEXT,
  customer_email TEXT,
  admin_notes TEXT,
  resolved_date TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE support_ticket ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on support_ticket" ON support_ticket FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: sale (from Sale)
-- ============================================
CREATE TABLE IF NOT EXISTS sale (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_sku TEXT,
  quantity NUMERIC,
  total_price NUMERIC,
  sale_date TEXT,
  unit_price NUMERIC,
  customer_id TEXT,
  product_name TEXT,
  payment_method TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE sale ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on sale" ON sale FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: promotion (from Promotion)
-- ============================================
CREATE TABLE IF NOT EXISTS promotion (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT,
  description TEXT,
  promotion_code TEXT,
  is_active BOOLEAN DEFAULT false,
  promotion_type TEXT,
  start_date TEXT,
  end_date TEXT,
  main_product TEXT,
  price_format TEXT,
  minimum_purchase TEXT,
  bonus_products JSONB DEFAULT '[]'::jsonb,
  experiential_items JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT,
  expected_roi TEXT,
  actual_sales TEXT,
  promotion_cost TEXT,
  analysis_notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE promotion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on promotion" ON promotion FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: experiential_product (from ExperientialProduct)
-- ============================================
CREATE TABLE IF NOT EXISTS experiential_product (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  related_promotion_id TEXT,
  cost NUMERIC,
  target_emotion TEXT,
  age_group TEXT,
  name TEXT,
  usage_context TEXT,
  type TEXT,
  value NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE experiential_product ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on experiential_product" ON experiential_product FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: user_activity (from UserActivity)
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pages_visited JSONB DEFAULT '[]'::jsonb,
  total_logins NUMERIC,
  user_email TEXT,
  registration_date TEXT,
  last_login TEXT,
  quality_score NUMERIC,
  actions_taken JSONB DEFAULT '[]'::jsonb,
  recommendations_implemented NUMERIC,
  files_uploaded NUMERIC,
  session_duration NUMERIC,
  business_moves_implemented NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on user_activity" ON user_activity FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: recommendation_rating (from RecommendationRating)
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_rating (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recommendation_id TEXT,
  customer_email TEXT,
  rating NUMERIC,
  feedback_text TEXT,
  implementation_status TEXT,
  actual_result TEXT,
  learning_insights TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE recommendation_rating ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on recommendation_rating" ON recommendation_rating FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: website_scan_result (from WebsiteScanResult)
-- ============================================
CREATE TABLE IF NOT EXISTS website_scan_result (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  website_url TEXT,
  scan_metadata JSONB,
  customer_email TEXT,
  business_analysis JSONB,
  scan_settings JSONB,
  services JSONB DEFAULT '[]'::jsonb,
  informational_analysis JSONB,
  website_type TEXT,
  products JSONB DEFAULT '[]'::jsonb,
  technical_details JSONB,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE website_scan_result ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on website_scan_result" ON website_scan_result FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: recommendation_feedback (from RecommendationFeedback)
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recommendation_id TEXT,
  customer_email TEXT,
  rating NUMERIC,
  feedback_text TEXT,
  implementation_status TEXT,
  actual_financial_impact TEXT,
  implementation_date TEXT,
  admin_response TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  whatsapp_message_id TEXT,
  whatsapp_phone TEXT,
  unique_recommendation_id TEXT,
  feedback_source TEXT,
  feedback_payload TEXT,
  received_at TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on recommendation_feedback" ON recommendation_feedback FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: user_engagement (from UserEngagement)
-- ============================================
CREATE TABLE IF NOT EXISTS user_engagement (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  engagement_date TEXT,
  engagement_level TEXT,
  recommendations_implemented_count NUMERIC,
  recommendations_clarification_count NUMERIC,
  recommendations_irrelevant_count NUMERIC,
  quality_score NUMERIC,
  quality_breakdown JSONB,
  risk_level TEXT,
  last_activity TEXT,
  files_count NUMERIC,
  has_catalog BOOLEAN DEFAULT false,
  has_forecast BOOLEAN DEFAULT false,
  total_recommendations NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on user_engagement" ON user_engagement FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: business_forecast (from BusinessForecast)
-- ============================================
CREATE TABLE IF NOT EXISTS business_forecast (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  forecast_name TEXT,
  version_name TEXT,
  is_editable BOOLEAN DEFAULT false,
  is_system_generated BOOLEAN DEFAULT false,
  rating TEXT,
  forecast_year NUMERIC,
  services_data JSONB DEFAULT '[]'::jsonb,
  global_employees_data JSONB DEFAULT '[]'::jsonb,
  other_costs JSONB,
  detailed_expenses JSONB,
  sales_forecast_data JSONB,
  profit_loss_summary JSONB,
  forecast_rating TEXT,
  business_plan_text TEXT,
  user_strategic_input_text TEXT,
  planned_employee_hires JSONB DEFAULT '[]'::jsonb,
  planned_business_moves JSONB DEFAULT '[]'::jsonb,
  target_long_term_goals JSONB DEFAULT '[]'::jsonb,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE business_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on business_forecast" ON business_forecast FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: strategic_move (from StrategicMove)
-- ============================================
CREATE TABLE IF NOT EXISTS strategic_move (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  execution_steps JSONB DEFAULT '[]'::jsonb,
  move_description TEXT,
  expected_breakthrough TEXT,
  move_type TEXT,
  title TEXT,
  competitive_advantage TEXT,
  innovation_score TEXT,
  execution_timeframe TEXT,
  move_name TEXT,
  customer_email TEXT,
  financial_potential TEXT,
  situation_description TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE strategic_move ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on strategic_move" ON strategic_move FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: financial_report (from FinancialReport)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_report (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  report_name TEXT,
  report_type TEXT,
  report_period TEXT,
  source_file_id TEXT,
  total_revenue NUMERIC,
  cost_of_goods_sold NUMERIC,
  gross_profit NUMERIC,
  operating_expenses NUMERIC,
  salary_expenses NUMERIC,
  administrative_expenses TEXT,
  marketing_expenses TEXT,
  other_expenses TEXT,
  total_expenses NUMERIC,
  operating_profit NUMERIC,
  financial_income TEXT,
  financial_expenses TEXT,
  net_profit_before_tax TEXT,
  tax_expenses TEXT,
  net_profit NUMERIC,
  analysis_confidence NUMERIC,
  extracted_data JSONB,
  analysis_notes TEXT,
  data_quality TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE financial_report ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on financial_report" ON financial_report FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: process_status (from ProcessStatus)
-- ============================================
CREATE TABLE IF NOT EXISTS process_status (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  related_entity_id TEXT,
  catalog_id TEXT,
  error_message TEXT,
  completed_at TEXT,
  metadata JSONB,
  customer_email TEXT,
  progress NUMERIC,
  result_data JSONB,
  started_at TEXT,
  process_type TEXT,
  status TEXT,
  current_step TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE process_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on process_status" ON process_status FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: strategic_plan_input (from StrategicPlanInput)
-- ============================================
CREATE TABLE IF NOT EXISTS strategic_plan_input (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  vision_for_next_year TEXT,
  desired_monthly_revenue NUMERIC,
  desired_monthly_net_profit NUMERIC,
  personal_take_home_pay_goal NUMERIC,
  why_start_business TEXT,
  real_reasons TEXT,
  motivation_strength TEXT,
  personal_investment_family TEXT,
  personal_investment_health TEXT,
  personal_investment_relationship TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  practical_skills_to_learn TEXT,
  management_skills_to_develop TEXT,
  three_year_profit_goal TEXT,
  business_values JSONB DEFAULT '[]'::jsonb,
  desired_culture TEXT,
  business_differentiation TEXT,
  branding_notes TEXT,
  marketing_platforms TEXT,
  marketing_investment TEXT,
  digital_infrastructure TEXT,
  automation_potential TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE strategic_plan_input ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on strategic_plan_input" ON strategic_plan_input FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: customer_contact (from CustomerContact)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_contact (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  phone TEXT,
  full_name TEXT,
  business_name TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE customer_contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on customer_contact" ON customer_contact FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: lead (from Lead)
-- ============================================
CREATE TABLE IF NOT EXISTS lead (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  business_name TEXT,
  utm_campaign TEXT,
  lead_source TEXT,
  utm_medium TEXT,
  customer_phone TEXT,
  first_contact_date TEXT,
  last_activity_date TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  priority TEXT,
  request_details TEXT,
  stage TEXT,
  assigned_manager_email TEXT,
  last_contact_date TEXT,
  customer_email TEXT,
  customer_name TEXT,
  lead_category TEXT,
  utm_source TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on lead" ON lead FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: financial_manager_performance (from FinancialManagerPerformance)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_manager_performance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  manager_email TEXT,
  manager_full_name TEXT,
  calculation_date TEXT,
  active_clients_count NUMERIC,
  quality_recommendations_count NUMERIC,
  last_client_interaction TEXT,
  last_system_login TEXT,
  estimated_client_profit NUMERIC,
  manager_score NUMERIC,
  interactions_count NUMERIC,
  login_frequency_score NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE financial_manager_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on financial_manager_performance" ON financial_manager_performance FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: communication_thread (from CommunicationThread)
-- ============================================
CREATE TABLE IF NOT EXISTS communication_thread (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  related_entity_id TEXT,
  related_entity_type TEXT,
  initiator_email TEXT,
  participants_emails JSONB DEFAULT '[]'::jsonb,
  is_private BOOLEAN DEFAULT false,
  last_message_timestamp TEXT,
  title TEXT,
  is_active BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE communication_thread ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on communication_thread" ON communication_thread FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: chat_message (from ChatMessage)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_message (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  thread_id TEXT,
  sender_email TEXT,
  message_text TEXT,
  mentions JSONB DEFAULT '[]'::jsonb,
  is_read_by JSONB DEFAULT '[]'::jsonb,
  message_type TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on chat_message" ON chat_message FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: notification (from Notification)
-- ============================================
CREATE TABLE IF NOT EXISTS notification (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipient_email TEXT,
  sender_email TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  priority TEXT,
  related_entity_id TEXT,
  related_entity_type TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on notification" ON notification FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: file_category (from FileCategory)
-- ============================================
CREATE TABLE IF NOT EXISTS file_category (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT,
  code TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE file_category ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on file_category" ON file_category FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: temp_upload (from TempUpload)
-- ============================================
CREATE TABLE IF NOT EXISTS temp_upload (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT,
  file_name TEXT,
  file_url TEXT,
  file_size NUMERIC,
  uploaded_at TEXT,
  category TEXT,
  checksum TEXT,
  source TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE temp_upload ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on temp_upload" ON temp_upload FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: recommendation_suggestion (from RecommendationSuggestion)
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_suggestion (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  suggested_manager_email TEXT,
  recommendation_title TEXT,
  viewed_at TEXT,
  recommendation_category TEXT,
  original_manager_email TEXT,
  responded_at TEXT,
  expected_profit TEXT,
  original_customer_email TEXT,
  original_recommendation_id TEXT,
  business_similarity_reason TEXT,
  suggested_customer_email TEXT,
  similarity_score NUMERIC,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE recommendation_suggestion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on recommendation_suggestion" ON recommendation_suggestion FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: manager_conversation (from ManagerConversation)
-- ============================================
CREATE TABLE IF NOT EXISTS manager_conversation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT,
  participant_1_email TEXT,
  participant_2_email TEXT,
  conversation_type TEXT,
  related_recommendation_id TEXT,
  related_client_email TEXT,
  conversation_title TEXT,
  last_message_at TEXT,
  last_message_by TEXT,
  unread_count_p1 NUMERIC,
  unread_count_p2 NUMERIC,
  status TEXT,
  priority TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE manager_conversation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on manager_conversation" ON manager_conversation FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: manager_message (from ManagerMessage)
-- ============================================
CREATE TABLE IF NOT EXISTS manager_message (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  is_read BOOLEAN DEFAULT false,
  message_content TEXT,
  read_at TEXT,
  message_type TEXT,
  conversation_id TEXT,
  sender_email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE manager_message ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on manager_message" ON manager_message FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: purchase_record (from PurchaseRecord)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_record (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  document_type TEXT,
  invoice_number TEXT,
  purchase_date TEXT,
  total_amount NUMERIC,
  net_amount NUMERIC,
  vat_amount NUMERIC,
  currency TEXT,
  file_upload_id TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  payment_terms TEXT,
  analysis_confidence NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE purchase_record ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on purchase_record" ON purchase_record FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: lead_commission (from LeadCommission)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_commission (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  notes TEXT,
  commission_amount NUMERIC,
  deal_value TEXT,
  commission_percentage NUMERIC,
  manager_email TEXT,
  lead_id TEXT,
  payment_date TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE lead_commission ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on lead_commission" ON lead_commission FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: goal_comment (from GoalComment)
-- ============================================
CREATE TABLE IF NOT EXISTS goal_comment (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goal_id TEXT,
  author_email TEXT,
  content TEXT,
  mentions JSONB DEFAULT '[]'::jsonb,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE goal_comment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on goal_comment" ON goal_comment FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: manual_forecast (from ManualForecast)
-- ============================================
CREATE TABLE IF NOT EXISTS manual_forecast (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  0 TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE manual_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on manual_forecast" ON manual_forecast FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: manual_forecast_sheet (from ManualForecastSheet)
-- ============================================
CREATE TABLE IF NOT EXISTS manual_forecast_sheet (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  forecast_id TEXT,
  sheet_name TEXT,
  sheet_index NUMERIC,
  header_row_index NUMERIC,
  original_columns JSONB DEFAULT '[]'::jsonb,
  row_count TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE manual_forecast_sheet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on manual_forecast_sheet" ON manual_forecast_sheet FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: manual_forecast_row (from ManualForecastRow)
-- ============================================
CREATE TABLE IF NOT EXISTS manual_forecast_row (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  forecast_id TEXT,
  sheet_id TEXT,
  row_index NUMERIC,
  period_month TEXT,
  category TEXT,
  subcategory TEXT,
  revenue NUMERIC,
  expenses NUMERIC,
  profit NUMERIC,
  currency TEXT,
  notes TEXT,
  extra JSONB,
  source_columns TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE manual_forecast_row ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on manual_forecast_row" ON manual_forecast_row FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: manual_forecast_mapping_profile (from ManualForecastMappingProfile)
-- ============================================
CREATE TABLE IF NOT EXISTS manual_forecast_mapping_profile (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  column_mappings TEXT,
  profile_name TEXT,
  is_default BOOLEAN DEFAULT false,
  file_type TEXT,
  customer_email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE manual_forecast_mapping_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on manual_forecast_mapping_profile" ON manual_forecast_mapping_profile FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: manual_forecast_version (from ManualForecastVersion)
-- ============================================
CREATE TABLE IF NOT EXISTS manual_forecast_version (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  version_name TEXT,
  snapshot_data TEXT,
  customer_email TEXT,
  version_number NUMERIC,
  changes_summary TEXT,
  forecast_id TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE manual_forecast_version ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on manual_forecast_version" ON manual_forecast_version FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: agent_support_ticket (from AgentSupportTicket)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_support_ticket (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  related_context TEXT,
  resolved_date TEXT,
  subject TEXT,
  customer_email TEXT,
  description TEXT,
  resolution_notes TEXT,
  type TEXT,
  manager_email TEXT,
  priority TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE agent_support_ticket ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on agent_support_ticket" ON agent_support_ticket FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: ofek360_model (from Ofek360Model)
-- ============================================
CREATE TABLE IF NOT EXISTS ofek360_model (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_source TEXT,
  last_updated_by TEXT,
  current_year NUMERIC,
  steps_data JSONB DEFAULT '[]'::jsonb,
  customer_email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE ofek360_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on ofek360_model" ON ofek360_model FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: backup_log (from BackupLog)
-- ============================================
CREATE TABLE IF NOT EXISTS backup_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  error_message TEXT,
  duration_seconds NUMERIC,
  entities_backed_up JSONB DEFAULT '[]'::jsonb,
  records_count NUMERIC,
  file_name TEXT,
  s3_path TEXT,
  backup_type TEXT,
  old_backups_deleted NUMERIC,
  triggered_by TEXT,
  backup_date TEXT,
  file_size NUMERIC,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on backup_log" ON backup_log FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: project_forecast (from ProjectForecast)
-- ============================================
CREATE TABLE IF NOT EXISTS project_forecast (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_description TEXT,
  forecast_year TEXT,
  customer_email TEXT,
  labor_costs TEXT,
  desired_margin_percentage TEXT,
  project_name TEXT,
  calculated TEXT,
  products JSONB DEFAULT '[]'::jsonb,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE project_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on project_forecast" ON project_forecast FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: catalog_mapping_profile (from CatalogMappingProfile)
-- ============================================
CREATE TABLE IF NOT EXISTS catalog_mapping_profile (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_email TEXT,
  profile_name TEXT,
  mapping_configuration JSONB,
  identifier_column TEXT,
  file_type TEXT,
  delimiter TEXT,
  header_row_index NUMERIC,
  last_used TEXT,
  is_active BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE catalog_mapping_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on catalog_mapping_profile" ON catalog_mapping_profile FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: department (from Department)
-- ============================================
CREATE TABLE IF NOT EXISTS department (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  department_name TEXT,
  department_head_email TEXT,
  operational_managers JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE department ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on department" ON department FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: cash_flow (from CashFlow)
-- ============================================
CREATE TABLE IF NOT EXISTS cash_flow (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT,
  account_number TEXT,
  is_projected BOOLEAN DEFAULT false,
  description TEXT,
  source TEXT,
  reference_number TEXT,
  payment_type TEXT,
  balance NUMERIC,
  customer_email TEXT,
  recurring_expense_id TEXT,
  category TEXT,
  credit NUMERIC,
  debit NUMERIC,
  bizibox_transaction_id TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on cash_flow" ON cash_flow FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: recurring_expense (from RecurringExpense)
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_expense (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date_range_end TEXT,
  customer_email TEXT,
  monthly_amounts JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  date_range_start TEXT,
  total_in_range NUMERIC,
  average_monthly NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE recurring_expense ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on recurring_expense" ON recurring_expense FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: organization_chart (from OrganizationChart)
-- ============================================
CREATE TABLE IF NOT EXISTS organization_chart (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chart_name TEXT,
  edges JSONB DEFAULT '[]'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  customer_email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE organization_chart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on organization_chart" ON organization_chart FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: goal_template (from GoalTemplate)
-- ============================================
CREATE TABLE IF NOT EXISTS goal_template (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_name TEXT,
  category TEXT,
  goal_title TEXT,
  goal_description TEXT,
  default_duration_days NUMERIC,
  suggested_tasks JSONB DEFAULT '[]'::jsonb,
  success_metrics TEXT,
  is_active BOOLEAN DEFAULT false,
  usage_count NUMERIC,
  created_by_admin TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE goal_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on goal_template" ON goal_template FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: service_contact (from ServiceContact)
-- ============================================
CREATE TABLE IF NOT EXISTS service_contact (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contact_name TEXT,
  contact_type TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT false,
  last_contact_date TEXT,
  phone TEXT,
  customer_email TEXT,
  company_name TEXT,
  login_credentials JSONB DEFAULT '[]'::jsonb,
  email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE service_contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on service_contact" ON service_contact FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: z_report_details (from ZReportDetails)
-- ============================================
CREATE TABLE IF NOT EXISTS z_report_details (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_url TEXT,
  detailed_products JSONB DEFAULT '[]'::jsonb,
  file_name TEXT,
  total_revenue NUMERIC,
  customer_email TEXT,
  detailed_products_file_url TEXT,
  products_count NUMERIC,
  forecast_id TEXT,
  month_assigned NUMERIC,
  upload_date TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE z_report_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on z_report_details" ON z_report_details FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: unknown_file_queue (from UnknownFileQueue)
-- ============================================
CREATE TABLE IF NOT EXISTS unknown_file_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  detected_columns JSONB DEFAULT '[]'::jsonb,
  file_url TEXT,
  resolved_by TEXT,
  admin_notes TEXT,
  resolved_date TEXT,
  file_name TEXT,
  customer_email TEXT,
  resolution_action TEXT,
  attempted_category TEXT,
  failure_reason TEXT,
  detected_format TEXT,
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE unknown_file_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on unknown_file_queue" ON unknown_file_queue FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: daily_checklist360 (from DailyChecklist360)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_checklist360 (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT,
  last_updated_by TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  general_notes TEXT,
  customer_email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE daily_checklist360 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on daily_checklist360" ON daily_checklist360 FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: system_credential (from SystemCredential)
-- ============================================
CREATE TABLE IF NOT EXISTS system_credential (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  password TEXT,
  last_updated_by TEXT,
  notes TEXT,
  website_url TEXT,
  customer_email TEXT,
  system_name TEXT,
  username TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE system_credential ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on system_credential" ON system_credential FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Table: user (from User)
-- ============================================
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  last_activity TEXT,
  user_type TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  phone TEXT,
  business_name TEXT,
  business_type TEXT,
  customer_type TEXT,
  company_size TEXT,
  monthly_revenue NUMERIC,
  employee_salaries NUMERIC,
  main_products TEXT,
  target_customers TEXT,
  business_goals TEXT,
  main_challenges TEXT,
  competitors TEXT,
  sales_channels TEXT,
  website_url TEXT,
  website_platform TEXT,
  address JSONB,
  service_providers TEXT,
  unwanted_products TEXT,
  bestselling_products TEXT,
  disabled TEXT,
  is_verified BOOLEAN DEFAULT false,
  app_id TEXT,
  is_service BOOLEAN DEFAULT false,
  _app_role TEXT,
  is_approved_by_admin BOOLEAN DEFAULT false,
  permissions JSONB,
  role TEXT,
  email TEXT,
  full_name TEXT,
  collaborator_role TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE user ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on user" ON user FOR ALL USING (true) WITH CHECK (true);
