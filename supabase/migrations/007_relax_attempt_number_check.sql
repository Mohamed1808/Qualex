-- Call attempts may now exceed 3 (a callback resets the no-answer streak and
-- lets attempts continue until the customer decides). The original
-- BETWEEN 1 AND 3 check blocked attempt 4+, so relax it to >= 1.
ALTER TABLE call_attempts DROP CONSTRAINT IF EXISTS call_attempts_attempt_number_check;
ALTER TABLE call_attempts ADD CONSTRAINT call_attempts_attempt_number_check CHECK (attempt_number >= 1);
