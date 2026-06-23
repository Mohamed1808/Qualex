-- Extend notification types to support supervisor pings and credit decisions
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead_assigned','sla_warning','sla_breach','duplicate_detected','callback_due',
    'new_lead_unassigned','lead_qualified','credit_decision'
  ));

-- Allow authenticated users to create notifications for other users
-- (assignment pings, supervisor pings, credit decisions). Reads stay
-- restricted to the recipient via the existing notifications_own policy.
DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
CREATE POLICY "notifications_insert_any" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);
