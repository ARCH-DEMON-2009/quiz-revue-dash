ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS question_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;
