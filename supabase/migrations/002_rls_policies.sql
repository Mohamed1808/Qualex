-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_occupations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update only own
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Admin: full access to leads
CREATE POLICY "admin_leads_all" ON leads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Telesales supervisor: all leads
CREATE POLICY "ts_supervisor_leads" ON leads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'telesales_supervisor')
);

-- Telesales agent: own assigned leads
CREATE POLICY "ts_agent_own_leads" ON leads FOR ALL USING (
  assigned_telesales_agent = auth.uid()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'telesales_agent')
);

-- DS supervisor: all DS-stage leads
CREATE POLICY "ds_supervisor_leads" ON leads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'direct_sales_supervisor')
);

-- DS agent: own assigned leads in DS stages
CREATE POLICY "ds_agent_own_leads" ON leads FOR ALL USING (
  assigned_direct_sales_agent = auth.uid()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'direct_sales_agent')
);

-- Call attempts
CREATE POLICY "call_attempts_agent_insert" ON call_attempts FOR INSERT WITH CHECK (agent_id = auth.uid());
CREATE POLICY "call_attempts_read" ON call_attempts FOR SELECT USING (
  agent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('telesales_supervisor','direct_sales_supervisor','admin'))
);
CREATE POLICY "call_attempts_update_own" ON call_attempts FOR UPDATE USING (agent_id = auth.uid());

-- Attendance
CREATE POLICY "attendance_own" ON daily_attendance FOR ALL USING (agent_id = auth.uid());
CREATE POLICY "attendance_supervisor_read" ON daily_attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('telesales_supervisor','direct_sales_supervisor','admin'))
);
CREATE POLICY "attendance_supervisor_update" ON daily_attendance FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('telesales_supervisor','direct_sales_supervisor','admin'))
);

-- Notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Config occupations: read all, admin write
CREATE POLICY "occupations_read" ON config_occupations FOR SELECT USING (true);
CREATE POLICY "occupations_admin" ON config_occupations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Script feedback
CREATE POLICY "script_feedback_insert" ON script_feedback FOR INSERT WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "script_feedback_read" ON script_feedback FOR SELECT USING (
  submitted_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('direct_sales_supervisor','telesales_supervisor','admin'))
);
CREATE POLICY "script_feedback_supervisor_update" ON script_feedback FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('direct_sales_supervisor','admin'))
);

-- Lead stage history: read by involved parties
CREATE POLICY "stage_history_read" ON lead_stage_history FOR SELECT USING (
  changed_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('telesales_supervisor','direct_sales_supervisor','admin'))
);
CREATE POLICY "stage_history_insert" ON lead_stage_history FOR INSERT WITH CHECK (true);
