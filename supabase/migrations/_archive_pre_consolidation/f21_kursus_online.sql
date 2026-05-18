-- F-21: Kursus Online dengan Progress Tracking
-- Migration: create course_modules, course_lessons, course_enrollments, lesson_progress

-- 1. Course modules linked to menu_items (product_type = 'course')
create table if not exists course_modules (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  title         text not null,
  description   text,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_course_modules_menu_item on course_modules(menu_item_id);

-- 2. Lessons inside a module
create table if not exists course_lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references course_modules(id) on delete cascade,
  title            text not null,
  description      text,
  video_url        text,
  duration_minutes int  not null default 0,
  sort_order       int  not null default 0,
  is_free_preview  boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists idx_course_lessons_module on course_lessons(module_id);

-- 3. Enrollment: tracks which user bought which course
create table if not exists course_enrollments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  order_id      uuid,
  enrolled_at   timestamptz not null default now(),
  unique(user_id, menu_item_id)
);

create index if not exists idx_course_enrollments_user on course_enrollments(user_id);
create index if not exists idx_course_enrollments_item on course_enrollments(menu_item_id);

-- 4. Lesson progress per user
create table if not exists lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  lesson_id     uuid not null references course_lessons(id) on delete cascade,
  completed_at  timestamptz,
  watch_seconds int  not null default 0,
  updated_at    timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create index if not exists idx_lesson_progress_user on lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson on lesson_progress(lesson_id);

-- RLS: allow authenticated users to read/write their own progress
alter table lesson_progress enable row level security;
create policy "Users manage own progress" on lesson_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table course_enrollments enable row level security;
create policy "Users see own enrollments" on course_enrollments
  for select using (auth.uid() = user_id);
create policy "Service can insert enrollments" on course_enrollments
  for insert with check (true);

alter table course_modules enable row level security;
create policy "Anyone can view modules" on course_modules
  for select using (true);
create policy "Auth can modify modules" on course_modules
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table course_lessons enable row level security;
create policy "Anyone can view lessons" on course_lessons
  for select using (true);
create policy "Auth can modify lessons" on course_lessons
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
