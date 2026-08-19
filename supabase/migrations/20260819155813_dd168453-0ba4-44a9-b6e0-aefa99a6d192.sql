CREATE TABLE IF NOT EXISTS public.tnc_exam_cache (
  exam_id TEXT NOT NULL PRIMARY KEY,
  exam_no INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT 'Quiz',
  max_marks NUMERIC NOT NULL DEFAULT 0,
  negative_marks NUMERIC NOT NULL DEFAULT 0.33,
  duration_minutes TEXT NOT NULL DEFAULT '90',
  question_count INTEGER NOT NULL DEFAULT 0,
  allow_for_premium BOOLEAN NOT NULL DEFAULT false,
  crm_created_at TEXT,
  questions JSONB,
  questions_synced_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.tnc_exam_cache TO service_role;

ALTER TABLE public.tnc_exam_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS tnc_exam_cache_exam_no_idx ON public.tnc_exam_cache (exam_no DESC);