CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id                 BIGSERIAL PRIMARY KEY,
  exam_id            TEXT NOT NULL,
  exam_name          TEXT,
  user_id            TEXT NOT NULL DEFAULT 'guest',
  user_name          TEXT,
  answers            JSONB NOT NULL DEFAULT '{}',
  score              NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_marks        NUMERIC(10,2) NOT NULL DEFAULT 0,
  correct_count      INTEGER NOT NULL DEFAULT 0,
  wrong_count        INTEGER NOT NULL DEFAULT 0,
  skipped_count      INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_exam_idx ON public.quiz_attempts(exam_id);

GRANT SELECT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);