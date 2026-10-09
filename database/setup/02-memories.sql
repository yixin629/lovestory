-- 02 回忆记录：照片、日记、留言、纪念日、回忆地图、情侣书架、情话
-- 用于全新的 Supabase 项目，依赖 01-core-auth.sql（couples、current_couple_id()、
-- apply_couple_policies()、add_to_realtime()、touch_updated_at()、photos Storage bucket）。
-- 可重复执行；不包含 DROP TABLE、TRUNCATE 或无条件 DELETE。
--
-- 包含的表与页面：
--   photos              /photos、/memory-map、首页（统计、随机回忆、那年今日）
--   diary_entries       /diary、/memory-map、首页（那年今日）
--   love_notes          /notes、首页（未读角标、随机回忆）
--   anniversaries       /anniversaries、首页（下一个纪念日、在一起天数、那年今日）
--   memory_places       /memory-map
--   novels              /novels
--   love_quotes         /love-quotes、首页（今日情话）——情侣自己添加的情话
--   love_quote_library  /love-quotes、首页（今日情话）——内置情话，只读目录表，不带 couple_id
--
-- /memory-map 还读取 schedules(id, title, description, event_date, location)，该表由 03 脚本创建。
-- 照片文件存放在 Storage photos bucket 的 <couple_id>/ 目录下，策略见 01-core-auth.sql。

-- ---------------------------------------------------------------------------
-- 照片
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT CHECK (title IS NULL OR char_length(title) <= 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  image_url TEXT NOT NULL CHECK (char_length(image_url) <= 1000),
  uploaded_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  tag TEXT NOT NULL DEFAULT '日常' CHECK (char_length(tag) <= 20),
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0)
);

CREATE INDEX IF NOT EXISTS photos_couple_created_idx ON photos(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS photos_couple_tag_idx ON photos(couple_id, tag);

SELECT apply_couple_policies('photos');
SELECT add_to_realtime('photos');

-- ---------------------------------------------------------------------------
-- 恋爱日记
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content TEXT NOT NULL CHECK (char_length(content) <= 50000),
  mood TEXT DEFAULT '😊' CHECK (mood IS NULL OR char_length(mood) <= 16),
  weather TEXT DEFAULT '☀️' CHECK (weather IS NULL OR char_length(weather) <= 50),
  stickers TEXT[] NOT NULL DEFAULT '{}',
  author UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  photos TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS diary_entries_couple_date_idx ON diary_entries(couple_id, date DESC);

DROP TRIGGER IF EXISTS diary_entries_touch ON diary_entries;
CREATE TRIGGER diary_entries_touch BEFORE UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

SELECT apply_couple_policies('diary_entries');

-- ---------------------------------------------------------------------------
-- 甜蜜留言
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS love_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  to_person UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  is_read BOOLEAN NOT NULL DEFAULT false,
  letter_style TEXT NOT NULL DEFAULT 'classic' CHECK (char_length(letter_style) <= 50),
  is_sealed BOOLEAN NOT NULL DEFAULT true,
  emojis TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS love_notes_couple_created_idx ON love_notes(couple_id, created_at DESC);

SELECT apply_couple_policies('love_notes');
SELECT add_to_realtime('love_notes');

-- ---------------------------------------------------------------------------
-- 纪念日
-- is_start = true 表示「我们在一起的日子」，首页「我们已经相爱 N 天」以最早的一条为准。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anniversaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  date DATE NOT NULL,
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  icon TEXT DEFAULT '💝' CHECK (icon IS NULL OR char_length(icon) <= 16),
  recurring BOOLEAN NOT NULL DEFAULT false,
  is_start BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS anniversaries_couple_date_idx ON anniversaries(couple_id, date);

SELECT apply_couple_policies('anniversaries');

-- ---------------------------------------------------------------------------
-- 回忆地图
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  location_name TEXT NOT NULL CHECK (char_length(location_name) BETWEEN 1 AND 160),
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  memory_date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  cover_url TEXT NOT NULL DEFAULT '' CHECK (char_length(cover_url) <= 1000),
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'photo', 'diary', 'schedule')),
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memory_places_couple_date_idx ON memory_places(couple_id, memory_date DESC);

DROP TRIGGER IF EXISTS memory_places_touch ON memory_places;
CREATE TRIGGER memory_places_touch BEFORE UPDATE ON memory_places
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

SELECT apply_couple_policies('memory_places');

-- ---------------------------------------------------------------------------
-- 情侣书架（likes 存点赞用户 ID 数组）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  author TEXT NOT NULL CHECK (char_length(author) BETWEEN 1 AND 100),
  cover_url TEXT CHECK (cover_url IS NULL OR char_length(cover_url) <= 1000),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  link TEXT CHECK (link IS NULL OR char_length(link) <= 1000),
  added_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  likes UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'want_to_read' CHECK (status IN ('want_to_read', 'reading', 'read'))
);

CREATE INDEX IF NOT EXISTS novels_couple_created_idx ON novels(couple_id, created_at DESC);

SELECT apply_couple_policies('novels');

-- ---------------------------------------------------------------------------
-- 情话：情侣自己添加的情话
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS love_quotes (
  id BIGSERIAL PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  author TEXT NOT NULL DEFAULT '匿名' CHECK (char_length(author) <= 50),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS love_quotes_couple_created_idx ON love_quotes(couple_id, created_at DESC);

SELECT apply_couple_policies('love_quotes');

-- ---------------------------------------------------------------------------
-- 情话：内置只读情话库（所有登录用户共享，可读不可写；不带 couple_id）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS love_quote_library (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL UNIQUE,
  author TEXT NOT NULL DEFAULT '佚名'
);

ALTER TABLE love_quote_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote library readable" ON love_quote_library;
CREATE POLICY "quote library readable" ON love_quote_library
  FOR SELECT TO authenticated
  USING (true);
-- 不创建写入策略：只能由管理员在 SQL Editor 中维护。

INSERT INTO love_quote_library (content, author) VALUES
('世界上有那么多的城镇，城镇中有那么多的酒馆，她却走进了我的。', '卡萨布兰卡'),
('我爱你，不是因为你是一个怎样的人，而是因为我喜欢与你在一起时的感觉。', '佚名'),
('想你的时候，我就看看天空，因为我知道我们在同一片天空下。', '佚名'),
('遇见你，是我这辈子最幸运的事。', '佚名'),
('我不要短暂的温存，只要你一世的陪伴。', '佚名'),
('遇见你的那天，樱花开满了整个春天', '春日记忆'),
('我想和你一起生活，在某个小镇，共享无尽的黄昏，和绵绵不绝的钟声', '茨维塔耶娃'),
('你是我温暖的手套，冰冷的啤酒，带着阳光味道的衬衫，日复一日的梦想', '村上春树'),
('我爱你，不光因为你的样子，还因为和你在一起时我的样子', '罗伊·克里夫特'),
('世界上最遥远的距离，不是生与死，而是我就站在你面前，你却不知道我爱你', '泰戈尔'),
('我渴望能见你一面，但请你记得，我不会开口要求见你。这不是因为骄傲，而是因为，唯有你也想见我的时候，我们见面才有意义', '西蒙·波伏娃'),
('我将于茫茫人海中访我唯一灵魂之伴侣，得之，我幸；不得，我命', '徐志摩'),
('想把你装进梦里，醒来也能看见你', '梦话'),
('你是我的今天，以及所有的明天', '余生'),
('我这一生都在关关难过，关关过，而你便是我最难过的那一关', '甜蜜告白'),
('陪你走过的路，是我这辈子最幸福的时光', '幸福时刻'),
('想给你一个拥抱，让全世界知道我有多爱你', '拥抱'),
('我喜欢你，认真且怂，从一而终', '告白'),
('我想和你在一起，几天不行，几百年也不够', '永恒'),
('最好的爱情是，我崇拜你像个英雄，你疼爱我像个孩子', '完美爱情'),
('我可以称呼你为您吗？这样我就可以把你放在心上了', '甜言蜜语'),
('如果星星知道自己背负着所有的愿望，那它一定努力地闪射自己的光芒', '星愿'),
('星星发亮是为了让每一个人有一天都能找到属于自己的星星', '小王子'),
('我喜欢你，就像星星喜欢在夜空中闪烁', '星光'),
('我希望有个如你一般的人，如山间清爽的风，如古城温暖的光，从清晨到夜晚，由山野到书房，只要最后是你，就好', '张嘉佳'),
('你问我爱你有多深，月亮代表我的心', '经典老歌'),
('因为你，我想要变成一个更好的人', '成长'),
('余生请多指教', '承诺'),
('想和你在一起，做你最坚实的依靠', '依靠'),
('你是我的独一无二，无可替代', '独特'),
('陪你到世界的尽头', '陪伴'),
('有你的地方就是家', '归属'),
('你是我的软肋，也是我的铠甲', '矛盾体'),
('往后余生，风雪是你，平淡是你，清贫也是你，荣华是你，心底温柔是你，目光所至也是你', '余生')
ON CONFLICT (content) DO NOTHING;
