-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('telesales_agent','telesales_supervisor','direct_sales_agent','direct_sales_supervisor','admin')),
  team TEXT CHECK (team IN ('telesales','direct_sales')),
  is_active BOOLEAN DEFAULT true,
  is_on_break BOOLEAN DEFAULT false,
  break_started_at TIMESTAMPTZ,
  shift_start TIME DEFAULT '09:00',
  shift_end TIME DEFAULT '17:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','meta','website','app','call_center')),
  requested_car_brand TEXT,
  requested_car_year INTEGER,
  source_campaign TEXT,
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES leads(id),
  channel_history JSONB DEFAULT '[]',
  assigned_telesales_agent UUID REFERENCES profiles(id),
  assigned_direct_sales_agent UUID REFERENCES profiles(id),
  telesales_assigned_at TIMESTAMPTZ,
  telesales_qualified_at TIMESTAMPTZ,
  direct_sales_assigned_at TIMESTAMPTZ,
  stage TEXT DEFAULT 'new' CHECK (stage IN ('new','telesales_assigned','telesales_in_progress','qualified','unqualified','ds_assigned','ds_in_progress','id_collected','credit_submitted','approved','rejected','unreachable','retired','terminated')),
  customer_national_id TEXT,
  salary_bracket TEXT,
  down_payment_bracket TEXT,
  financing_program TEXT CHECK (financing_program IN ('new_car','used_car','collateral')),
  car_source TEXT CHECK (car_source IN ('dealer','individual_c2c','undecided')),
  knows_specific_car BOOLEAN,
  occupation TEXT,
  customer_id_reference TEXT,
  tele_disposition TEXT CHECK (tele_disposition IN ('qualified','unqualified','no_answer','terminated','retired')),
  ds_disposition TEXT CHECK (ds_disposition IN ('qualified','unqualified','no_answer','terminated','retired')),
  tele_sla_due_at TIMESTAMPTZ,
  tele_sla_breached BOOLEAN DEFAULT false,
  ds_sla_due_at TIMESTAMPTZ,
  ds_sla_breached BOOLEAN DEFAULT false,
  tele_follow_up_at TIMESTAMPTZ,
  ds_follow_up_at TIMESTAMPTZ,
  id_document_url TEXT,
  tele_notes TEXT,
  ds_notes TEXT,
  unqualification_reason TEXT
);

-- Call attempts
CREATE TABLE IF NOT EXISTS call_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id),
  stage TEXT NOT NULL CHECK (stage IN ('telesales','direct_sales')),
  attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
  called_at TIMESTAMPTZ DEFAULT now(),
  outcome TEXT NOT NULL CHECK (outcome IN ('answered','no_answer','callback_scheduled')),
  callback_at TIMESTAMPTZ,
  agent_confirmed_call BOOLEAN DEFAULT false,
  notes TEXT
);

-- Daily attendance
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  checked_out BOOLEAN DEFAULT false,
  checked_out_at TIMESTAMPTZ,
  on_break BOOLEAN DEFAULT false,
  break_log JSONB DEFAULT '[]',
  UNIQUE(agent_id, date)
);

-- Script feedback
CREATE TABLE IF NOT EXISTS script_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  feedback_stage TEXT NOT NULL CHECK (feedback_stage IN ('tele_qa','ds_override','credit_rejection')),
  submitted_by UUID REFERENCES profiles(id),
  reason_code TEXT NOT NULL,
  reason_detail TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lead stage history
CREATE TABLE IF NOT EXISTS lead_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

-- Config occupations
CREATE TABLE IF NOT EXISTS config_occupations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('new_lead_assigned','sla_warning','sla_breach','duplicate_detected','callback_due')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON leads(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_telesales ON leads(assigned_telesales_agent);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_ds ON leads(assigned_direct_sales_agent);
CREATE INDEX IF NOT EXISTS idx_leads_sla_tele ON leads(tele_sla_due_at) WHERE NOT tele_sla_breached;
CREATE INDEX IF NOT EXISTS idx_leads_sla_ds ON leads(ds_sla_due_at) WHERE NOT ds_sla_breached;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_call_attempts_lead ON call_attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_attendance_agent_date ON daily_attendance(agent_id, date);
