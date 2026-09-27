ALTER TABLE public.tnc_exam_cache
  ADD COLUMN IF NOT EXISTS group_name text;

CREATE INDEX IF NOT EXISTS tnc_exam_cache_group_name_idx
  ON public.tnc_exam_cache (group_name);
