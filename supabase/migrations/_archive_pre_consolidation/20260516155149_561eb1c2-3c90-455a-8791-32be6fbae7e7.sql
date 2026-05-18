
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_modules_menu_item ON public.course_modules(menu_item_id);

CREATE TABLE public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_lessons_module ON public.course_lessons(module_id);

CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_item_id)
);
CREATE INDEX idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_menu_item ON public.course_enrollments(menu_item_id);

CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Modules & lessons: publicly readable (course catalogue), only shop owners/staff manage
CREATE POLICY "Course modules viewable by everyone"
  ON public.course_modules FOR SELECT USING (true);
CREATE POLICY "Course lessons viewable by everyone"
  ON public.course_lessons FOR SELECT USING (true);

CREATE POLICY "Shop owners manage modules"
  ON public.course_modules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.coffee_shops cs ON cs.id = mi.shop_id
    WHERE mi.id = course_modules.menu_item_id AND cs.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.coffee_shops cs ON cs.id = mi.shop_id
    WHERE mi.id = course_modules.menu_item_id AND cs.owner_id = auth.uid()
  ));

CREATE POLICY "Shop owners manage lessons"
  ON public.course_lessons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.menu_items mi ON mi.id = cm.menu_item_id
    JOIN public.coffee_shops cs ON cs.id = mi.shop_id
    WHERE cm.id = course_lessons.module_id AND cs.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.menu_items mi ON mi.id = cm.menu_item_id
    JOIN public.coffee_shops cs ON cs.id = mi.shop_id
    WHERE cm.id = course_lessons.module_id AND cs.owner_id = auth.uid()
  ));

-- Enrollments: user sees own; shop owner sees their course enrollments
CREATE POLICY "Users view own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.coffee_shops cs ON cs.id = mi.shop_id
    WHERE mi.id = course_enrollments.menu_item_id AND cs.owner_id = auth.uid()
  ));
CREATE POLICY "Users insert own enrollments"
  ON public.course_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own enrollments"
  ON public.course_enrollments FOR DELETE USING (auth.uid() = user_id);

-- Lesson progress: only owner of progress row
CREATE POLICY "Users view own progress"
  ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress"
  ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress"
  ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own progress"
  ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id);
