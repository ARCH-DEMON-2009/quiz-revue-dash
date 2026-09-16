ALTER TABLE public.tnc_exam_cache
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS category_reason text;

CREATE INDEX IF NOT EXISTS tnc_exam_cache_category_idx ON public.tnc_exam_cache (category);