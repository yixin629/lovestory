-- 01 核心：账号资料、情侣配对、共用的 RLS 辅助函数、Storage bucket 与策略
-- 用于全新的 Supabase 项目，必须在其他 setup 脚本之前执行，可重复执行。
-- 不包含 DROP TABLE、TRUNCATE 或无条件 DELETE。
--
-- 数据隔离模型：
--   * 每个用户通过 Supabase Auth 注册，user_profiles.id = auth.users.id。
--   * 两个用户通过邀请码组成一对情侣（couples + couple_members）。
--   * 业务表都带 couple_id，默认值为 current_couple_id()，RLS 只允许本情侣成员读写。

-- ---------------------------------------------------------------------------
-- 个人资料
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '新朋友' CHECK (char_length(display_name) BETWEEN 1 AND 30),
  nickname TEXT CHECK (nickname IS NULL OR char_length(nickname) <= 30),
  birthday DATE,
  avatar_emoji TEXT DEFAULT '😊' CHECK (avatar_emoji IS NULL OR char_length(avatar_emoji) <= 16),
  avatar_url TEXT CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 注册时自动创建资料行，昵称取注册表单传入的 display_name。
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(left(btrim(NEW.raw_user_meta_data ->> 'display_name'), 30), ''), '新朋友')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 情侣配对
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{8}$'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_id 为主键：一个用户同一时间只能属于一对情侣。
CREATE TABLE IF NOT EXISTS couple_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS couple_members_couple_idx ON couple_members(couple_id);

-- 当前登录用户所在情侣 ID。SECURITY DEFINER 避免在 couple_members 的策略里递归。
CREATE OR REPLACE FUNCTION current_couple_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT couple_id FROM couple_members WHERE user_id = auth.uid()
$$;

-- 当前登录用户的另一半 ID；还没配对或对方未加入时为 NULL。
CREATE OR REPLACE FUNCTION current_partner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.user_id
  FROM couple_members m
  WHERE m.couple_id = (SELECT couple_id FROM couple_members WHERE user_id = auth.uid())
    AND m.user_id <> auth.uid()
  LIMIT 1
$$;

-- 判断某个用户 ID 是否属于当前用户的情侣（本人或另一半）。业务表的身份列用它校验。
CREATE OR REPLACE FUNCTION is_couple_member(target UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target IS NOT NULL AND EXISTS (
    SELECT 1 FROM couple_members
    WHERE user_id = target
      AND couple_id = (SELECT couple_id FROM couple_members WHERE user_id = auth.uid())
  )
$$;

-- 创建情侣空间并返回邀请码。已在情侣中时直接返回现有邀请码。
CREATE OR REPLACE FUNCTION create_couple()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_code TEXT;
  new_couple UUID;
  new_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '请先登录' USING ERRCODE = '28000';
  END IF;

  SELECT c.invite_code INTO existing_code
  FROM couple_members m JOIN couples c ON c.id = m.couple_id
  WHERE m.user_id = auth.uid();
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  LOOP
    new_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM couples WHERE invite_code = new_code);
  END LOOP;

  INSERT INTO couples (invite_code, created_by) VALUES (new_code, auth.uid()) RETURNING id INTO new_couple;
  INSERT INTO couple_members (user_id, couple_id) VALUES (auth.uid(), new_couple);
  RETURN new_code;
END;
$$;

-- 通过邀请码加入情侣空间。每对最多两人。
CREATE OR REPLACE FUNCTION join_couple(code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID;
  member_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '请先登录' USING ERRCODE = '28000';
  END IF;
  IF EXISTS (SELECT 1 FROM couple_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION '你已经在一个情侣空间里了';
  END IF;

  SELECT id INTO target FROM couples WHERE invite_code = upper(btrim(code)) FOR UPDATE;
  IF target IS NULL THEN
    RAISE EXCEPTION '邀请码不存在';
  END IF;

  SELECT COUNT(*) INTO member_count FROM couple_members WHERE couple_id = target;
  IF member_count >= 2 THEN
    RAISE EXCEPTION '这个情侣空间已经满员';
  END IF;

  INSERT INTO couple_members (user_id, couple_id) VALUES (auth.uid(), target);
  RETURN target;
END;
$$;

-- 离开情侣空间。最后一个成员离开时删除整个空间，所有带 couple_id 的数据会级联删除。
CREATE OR REPLACE FUNCTION leave_couple()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID;
BEGIN
  SELECT couple_id INTO target FROM couple_members WHERE user_id = auth.uid();
  IF target IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM couple_members WHERE user_id = auth.uid();
  IF NOT EXISTS (SELECT 1 FROM couple_members WHERE couple_id = target) THEN
    DELETE FROM couples WHERE id = target;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION create_couple() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION join_couple(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION leave_couple() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_couple() TO authenticated;
GRANT EXECUTE ON FUNCTION join_couple(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_couple() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles readable by self and partner" ON user_profiles;
CREATE POLICY "profiles readable by self and partner" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_couple_member(id));

DROP POLICY IF EXISTS "profiles editable by owner" ON user_profiles;
CREATE POLICY "profiles editable by owner" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "couples readable by members" ON couples;
CREATE POLICY "couples readable by members" ON couples
  FOR SELECT TO authenticated
  USING (id = current_couple_id());

DROP POLICY IF EXISTS "members readable within couple" ON couple_members;
CREATE POLICY "members readable within couple" ON couple_members
  FOR SELECT TO authenticated
  USING (couple_id = current_couple_id());

-- couples / couple_members 的写入只通过上面的 SECURITY DEFINER 函数完成，不开放直接写策略。

-- ---------------------------------------------------------------------------
-- 通用工具
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_touch ON user_profiles;
CREATE TRIGGER user_profiles_touch BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 为业务表加上标准的情侣隔离策略：本情侣成员可读、可写、可删。
-- 用法：SELECT apply_couple_policies('photos');
CREATE OR REPLACE FUNCTION apply_couple_policies(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('DROP POLICY IF EXISTS "couple members manage rows" ON %I', table_name);
  EXECUTE format(
    'CREATE POLICY "couple members manage rows" ON %I FOR ALL TO authenticated '
    'USING (couple_id = current_couple_id()) WITH CHECK (couple_id = current_couple_id())',
    table_name
  );
END;
$$;

-- 把表加入 Realtime publication（已加入时跳过）。
CREATE OR REPLACE FUNCTION add_to_realtime(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name
  ) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
  END IF;
END;
$$;

SELECT add_to_realtime('couple_members');

-- ---------------------------------------------------------------------------
-- Storage：photos 存在 <couple_id>/ 目录下，avatars 存在 <user_id>/ 目录下。
-- bucket 为公开读取（页面使用 getPublicUrl），路径包含随机 UUID，写入受策略限制。
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true), ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "photos written by couple" ON storage.objects;
CREATE POLICY "photos written by couple" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = current_couple_id()::text);

DROP POLICY IF EXISTS "photos updated by couple" ON storage.objects;
CREATE POLICY "photos updated by couple" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = current_couple_id()::text);

DROP POLICY IF EXISTS "photos deleted by couple" ON storage.objects;
CREATE POLICY "photos deleted by couple" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = current_couple_id()::text);

DROP POLICY IF EXISTS "avatars written by owner" ON storage.objects;
CREATE POLICY "avatars written by owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars updated by owner" ON storage.objects;
CREATE POLICY "avatars updated by owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars deleted by owner" ON storage.objects;
CREATE POLICY "avatars deleted by owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
