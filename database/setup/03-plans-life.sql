-- 03 计划与生活：签到、心情、穿搭、日程、倒计时、时光胶囊、心愿、100 件事、共同账本、提醒
-- 依赖：必须先执行 01-core-auth.sql（couples、current_couple_id()、apply_couple_policies()、
--       add_to_realtime()、touch_updated_at()）。面向全新的 Supabase 库，可重复执行。
-- 不包含 DROP TABLE、TRUNCATE 或无条件 DELETE；没有全局种子数据。
--
-- 表 → 页面：
--   check_ins          /check-in（首页统计也会 count）
--   mood_records       /mood-tracker
--   outfit_records     /outfit-records
--   schedules          /schedule（/memory-map 只读 id、title、description、event_date、location）
--   countdowns         /countdown
--   time_capsules      /time-capsule
--   wishlist           /wishlist（首页统计也会 count）
--   love_bucket_list   /bucket-list
--   shared_expenses    /expenses（Realtime）
--   reminders          /profile（全局头像菜单按 remind_to 统计未读提醒）
--
-- 隔离模型：每张表都有 couple_id（默认 current_couple_id()），RLS 只允许本情侣成员读写。
-- 身份列存 auth.users 的 UUID；账号被删除时置为 NULL，页面显示为「Ta」。
--
-- 注意：time_capsules 的「只有创建者/收件人可开启」「到开启时间才能看内容」「只有创建者可删除」
-- 都只是前端体验，不是可信授权。RLS 只按情侣隔离，同一情侣的两个成员在数据库层都能
-- 直接读取 content、修改 is_opened 或删除胶囊。

-- ---------------------------------------------------------------------------
-- 每日签到
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS check_ins_couple_idx ON check_ins(couple_id);
CREATE INDEX IF NOT EXISTS check_ins_user_date_idx ON check_ins(user_id, check_in_date DESC);
SELECT apply_couple_policies('check_ins');

-- ---------------------------------------------------------------------------
-- 心情追踪
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mood_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mood_records_couple_idx ON mood_records(couple_id);
CREATE INDEX IF NOT EXISTS mood_records_user_created_idx ON mood_records(user_id, created_at DESC);
SELECT apply_couple_policies('mood_records');

-- ---------------------------------------------------------------------------
-- 穿搭记录（photo_url 目前存的是 emoji）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outfit_records (
  id BIGSERIAL PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT,
  style_tags TEXT[] NOT NULL DEFAULT '{}',
  occasion TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outfit_records_couple_idx ON outfit_records(couple_id);
CREATE INDEX IF NOT EXISTS outfit_records_couple_date_idx ON outfit_records(couple_id, date DESC);
SELECT apply_couple_policies('outfit_records');

-- ---------------------------------------------------------------------------
-- 共享日程（/memory-map 也会读取）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  reminder_minutes INTEGER DEFAULT 30 CHECK (reminder_minutes IS NULL OR reminder_minutes >= 0),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedules_couple_idx ON schedules(couple_id);
CREATE INDEX IF NOT EXISTS schedules_couple_event_idx ON schedules(couple_id, event_date);
SELECT apply_couple_policies('schedules');

-- ---------------------------------------------------------------------------
-- 倒计时 / 正计时
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS countdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('countdown', 'countup')),
  emoji TEXT DEFAULT '⏰',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS countdowns_couple_idx ON countdowns(couple_id);
CREATE INDEX IF NOT EXISTS countdowns_couple_target_idx ON countdowns(couple_id, target_date);
SELECT apply_couple_policies('countdowns');

-- ---------------------------------------------------------------------------
-- 时光胶囊
-- 收件人、开启时间、仅创建者删除等限制只在前端检查（见文件顶部说明），不是可信授权。
-- receiver 为 NULL 表示未指定收件人（页面上只有创建者可开启）。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sender UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  receiver UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unlock_date TIMESTAMPTZ NOT NULL,
  is_opened BOOLEAN NOT NULL DEFAULT FALSE,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_capsules_couple_idx ON time_capsules(couple_id);
CREATE INDEX IF NOT EXISTS time_capsules_couple_unlock_idx ON time_capsules(couple_id, unlock_date);
SELECT apply_couple_policies('time_capsules');

-- ---------------------------------------------------------------------------
-- 心愿清单
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  completed_at TIMESTAMPTZ,
  added_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wishlist_couple_idx ON wishlist(couple_id);
CREATE INDEX IF NOT EXISTS wishlist_couple_created_idx ON wishlist(couple_id, created_at DESC);
SELECT apply_couple_policies('wishlist');

-- ---------------------------------------------------------------------------
-- 100 件想一起做的事
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS love_bucket_list (
  id BIGSERIAL PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS love_bucket_list_couple_idx ON love_bucket_list(couple_id);
SELECT apply_couple_policies('love_bucket_list');

-- ---------------------------------------------------------------------------
-- 共同账本
-- paid_by 为付款人用户 ID；账号删除后为 NULL，不再参与结算。
-- split_ratio 为付款人自己承担的比例（equal = 0.5，full = 1.0）。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('food', 'date', 'travel', 'gift', 'home', 'transport', 'shopping', 'other')),
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  split_mode TEXT NOT NULL DEFAULT 'equal' CHECK (split_mode IN ('equal', 'full', 'custom')),
  split_ratio NUMERIC(3, 2) NOT NULL DEFAULT 0.5 CHECK (split_ratio >= 0 AND split_ratio <= 1),
  note TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS shared_expenses_couple_idx ON shared_expenses(couple_id);
CREATE INDEX IF NOT EXISTS shared_expenses_couple_date_idx ON shared_expenses(couple_id, expense_date DESC);
SELECT apply_couple_policies('shared_expenses');
SELECT add_to_realtime('shared_expenses');

-- 付款人必须是本情侣成员（本人或另一半），避免写入任意用户 ID。
DROP POLICY IF EXISTS "couple members manage rows" ON shared_expenses;
CREATE POLICY "couple members manage rows" ON shared_expenses
  FOR ALL TO authenticated
  USING (couple_id = current_couple_id())
  WITH CHECK (couple_id = current_couple_id() AND (paid_by IS NULL OR is_couple_member(paid_by)));

-- ---------------------------------------------------------------------------
-- 提醒（/profile）
-- remind_to：被提醒人（本人或另一半）的用户 ID。
-- created_by：创建者用户 ID；NULL 表示页面自动生成的生日提醒，因此不设 DEFAULT auth.uid()。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  remind_date DATE NOT NULL,
  remind_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reminders_couple_idx ON reminders(couple_id);
CREATE INDEX IF NOT EXISTS reminders_couple_date_idx ON reminders(couple_id, remind_date);
CREATE INDEX IF NOT EXISTS reminders_remind_to_idx ON reminders(remind_to, is_sent, remind_date);
SELECT apply_couple_policies('reminders');

-- 被提醒人必须是本情侣成员。
DROP POLICY IF EXISTS "couple members manage rows" ON reminders;
CREATE POLICY "couple members manage rows" ON reminders
  FOR ALL TO authenticated
  USING (couple_id = current_couple_id())
  WITH CHECK (couple_id = current_couple_id() AND (remind_to IS NULL OR is_couple_member(remind_to)));
