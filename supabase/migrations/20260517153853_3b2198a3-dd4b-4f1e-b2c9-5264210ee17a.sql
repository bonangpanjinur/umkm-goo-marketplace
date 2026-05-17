-- Add draft/published status to course modules and lessons
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','published'));

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','published'));

-- Backfill: jadikan published modul & pelajaran yang sudah ada agar tidak
-- "hilang" dari mata customer setelah upgrade.
UPDATE public.course_modules SET status = 'published' WHERE status = 'draft';
UPDATE public.course_lessons SET status = 'published' WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_course_modules_status ON public.course_modules(status);
CREATE INDEX IF NOT EXISTS idx_course_lessons_status ON public.course_lessons(status);