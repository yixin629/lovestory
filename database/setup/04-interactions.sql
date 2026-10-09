-- 04 甜蜜互动：聊天、互动通知、双人空间、万能转盘、问答/真心话、功能申请、星座/塔罗、换装作品墙
-- 面向全新的 Supabase 项目，依赖 01-core-auth.sql（couples、current_couple_id()、is_couple_member()、
-- apply_couple_policies()、add_to_realtime()、touch_updated_at()），必须在其之后执行。可重复执行。
-- 不包含 DROP TABLE、TRUNCATE 或无条件 DELETE；种子数据使用 ON CONFLICT DO NOTHING。
--
-- 情侣隔离表（couple_id 默认 current_couple_id()，RLS 仅本情侣成员可读写）：
--   chat_messages        -> /chat
--   couple_notifications -> 全局 NotificationCenter、lib/couple-interactions.ts
--   couple_gifts         -> /couple-space（礼物箱）
--   couple_growth        -> /couple-space（共同养成，每对情侣一行，couple_id 为主键）
--   decision_options     -> /food（本情侣的自定义转盘选项/小惩罚）
--   couple_quiz          -> /couple-quiz
--   quiz_results         -> /couple-quiz
--   truth_or_dare        -> /truth-or-dare（只存自定义题目，内置题目在页面代码里）
--   feature_requests     -> /feature-requests
--   horoscope_readings   -> /horoscope
--   tarot_readings       -> /tarot
--   dress_up_outfits     -> /dress-up（作品墙仅本情侣可见）
-- 只读目录表（不带 couple_id，所有登录用户可读、不可写，内容由本脚本种子维护）：
--   food_options             -> /food「今晚吃什么」内置菜单
--   decision_option_presets  -> /food 其他转盘的内置选项（与具体人相关的选项由页面按当前情侣生成）
-- RPC：
--   toggle_dress_up_outfit_like(p_outfit_id UUID) -> /dress-up 点赞（使用 auth.uid()，只能操作本情侣作品）

-- ---------------------------------------------------------------------------
-- 聊天
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  sender UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (char_length(message_type) BETWEEN 1 AND 20),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_couple_created_idx ON chat_messages(couple_id, created_at);

SELECT apply_couple_policies('chat_messages');

-- 只能以自己的身份发消息
DROP POLICY IF EXISTS "chat sender is self" ON chat_messages;
CREATE POLICY "chat sender is self" ON chat_messages AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (sender = auth.uid());

SELECT add_to_realtime('chat_messages');

-- ---------------------------------------------------------------------------
-- 互动通知
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS couple_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  recipient UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (char_length(notification_type) BETWEEN 1 AND 50),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  link TEXT NOT NULL DEFAULT '/' CHECK (char_length(link) <= 300),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS couple_notifications_couple_idx ON couple_notifications(couple_id);
CREATE INDEX IF NOT EXISTS couple_notifications_recipient_idx
  ON couple_notifications(recipient, read_at, created_at DESC);

SELECT apply_couple_policies('couple_notifications');

-- 只能以自己的身份发给本情侣成员
DROP POLICY IF EXISTS "notification actor and recipient in couple" ON couple_notifications;
CREATE POLICY "notification actor and recipient in couple" ON couple_notifications AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (actor = auth.uid() AND is_couple_member(recipient));

SELECT add_to_realtime('couple_notifications');

-- ---------------------------------------------------------------------------
-- 双人空间：礼物箱、共同养成
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS couple_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  sender UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_type TEXT NOT NULL CHECK (char_length(gift_type) BETWEEN 1 AND 40),
  emoji TEXT NOT NULL DEFAULT '🎁' CHECK (char_length(emoji) <= 16),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (recipient <> sender)
);

CREATE INDEX IF NOT EXISTS couple_gifts_couple_idx ON couple_gifts(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS couple_gifts_recipient_idx ON couple_gifts(recipient, created_at DESC);

SELECT apply_couple_policies('couple_gifts');

DROP POLICY IF EXISTS "gift sender is self and recipient in couple" ON couple_gifts;
CREATE POLICY "gift sender is self and recipient in couple" ON couple_gifts AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (sender = auth.uid() AND is_couple_member(recipient));

-- 每对情侣一行；页面首次访问时插入，couple_id 由默认值填充。
CREATE TABLE IF NOT EXISTS couple_growth (
  couple_id UUID PRIMARY KEY DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  pet_name TEXT NOT NULL DEFAULT '团团' CHECK (char_length(pet_name) BETWEEN 1 AND 30),
  pet_kind TEXT NOT NULL DEFAULT 'cat' CHECK (pet_kind IN ('cat', 'dog', 'rabbit')),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  garden_points INTEGER NOT NULL DEFAULT 0 CHECK (garden_points >= 0),
  last_cared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_cared_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT apply_couple_policies('couple_growth');

DROP TRIGGER IF EXISTS couple_growth_touch ON couple_growth;
CREATE TRIGGER couple_growth_touch BEFORE UPDATE ON couple_growth
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- 万能转盘
-- ---------------------------------------------------------------------------
-- 本情侣的自定义选项
CREATE TABLE IF NOT EXISTS decision_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  wheel_type TEXT NOT NULL CHECK (char_length(wheel_type) BETWEEN 1 AND 40),
  option_kind TEXT NOT NULL DEFAULT 'choice' CHECK (option_kind IN ('choice', 'punishment')),
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  emoji TEXT NOT NULL DEFAULT '✨' CHECK (char_length(emoji) <= 16),
  category TEXT NOT NULL DEFAULT '自定义' CHECK (char_length(category) BETWEEN 1 AND 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decision_options_couple_idx
  ON decision_options(couple_id, wheel_type, option_kind, created_at);

SELECT apply_couple_policies('decision_options');

-- 内置选项目录（只读，所有情侣共享）。id 即旧库的 source_key。
CREATE TABLE IF NOT EXISTS decision_option_presets (
  id TEXT PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 80),
  wheel_type TEXT NOT NULL CHECK (char_length(wheel_type) BETWEEN 1 AND 40),
  option_kind TEXT NOT NULL DEFAULT 'choice' CHECK (option_kind IN ('choice', 'punishment')),
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  emoji TEXT NOT NULL DEFAULT '✨' CHECK (char_length(emoji) <= 16),
  category TEXT NOT NULL DEFAULT '基础选项' CHECK (char_length(category) BETWEEN 1 AND 40),
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE decision_option_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presets readable by signed-in users" ON decision_option_presets;
CREATE POLICY "presets readable by signed-in users" ON decision_option_presets
  FOR SELECT TO authenticated
  USING (true);
-- 不创建写策略：客户端无法增删改目录。

INSERT INTO decision_option_presets (id, wheel_type, option_kind, label, emoji, category, sort_order) VALUES
  ('dishes-together', 'dishes', 'choice', '一起洗', '🫶', '一起完成', 1),
  ('dishes-rps', 'dishes', 'choice', '猜拳决定', '✊', '再玩一局', 2),
  ('dishes-cook-rest', 'dishes', 'choice', '做饭的人不用洗', '🍳', '公平规则', 3),
  ('dishes-tomorrow', 'dishes', 'choice', '今天休息，明天补上', '🌙', '延期处理', 4),
  ('dishes-half', 'dishes', 'choice', '各洗一半', '🫧', '一起完成', 5),
  ('dishes-loser', 'dishes', 'choice', '输家洗碗', '🎮', '再玩一局', 6),
  ('dishes-machine', 'dishes', 'choice', '洗碗机全权负责', '🤖', '科技帮忙', 7),
  ('dishes-takeaway', 'dishes', 'choice', '点外卖，今晚不洗', '🥡', '快乐偷懒', 8),
  ('movie-comedy', 'movie', 'choice', '喜剧', '😂', '电影类型', 9),
  ('movie-action', 'movie', 'choice', '动作片', '💥', '电影类型', 10),
  ('movie-romance', 'movie', 'choice', '爱情片', '💗', '电影类型', 11),
  ('movie-animation', 'movie', 'choice', '动画片', '🧸', '电影类型', 12),
  ('movie-scifi', 'movie', 'choice', '科幻片', '🚀', '电影类型', 13),
  ('movie-horror', 'movie', 'choice', '恐怖片', '👻', '电影类型', 14),
  ('movie-mystery', 'movie', 'choice', '悬疑片', '🔍', '电影类型', 15),
  ('movie-documentary', 'movie', 'choice', '纪录片', '🌍', '电影类型', 16),
  ('movie-classic', 'movie', 'choice', '经典老片', '📽️', '特别片单', 17),
  ('movie-new', 'movie', 'choice', '高分新片', '🌟', '特别片单', 18),
  ('movie-cn', 'movie', 'choice', '国产片', '🐼', '地区片单', 19),
  ('movie-kr', 'movie', 'choice', '韩国电影', '🇰🇷', '地区片单', 20),
  ('movie-jp', 'movie', 'choice', '日本电影', '🇯🇵', '地区片单', 21),
  ('movie-random', 'movie', 'choice', '闭眼盲选一部', '🙈', '特别片单', 22),
  ('weekend-home', 'weekend', 'choice', '宅家做饭', '🏠', '宅家约会', 23),
  ('weekend-park', 'weekend', 'choice', '公园散步', '🌳', '轻松出门', 24),
  ('weekend-cafe', 'weekend', 'choice', '探一家咖啡店', '☕', '轻松出门', 25),
  ('weekend-cinema', 'weekend', 'choice', '去电影院', '🎦', '室内活动', 26),
  ('weekend-walk', 'weekend', 'choice', '随机散步探索', '🚶', '轻松出门', 27),
  ('weekend-trip', 'weekend', 'choice', '周边一日游', '🚗', '短途旅行', 28),
  ('weekend-picnic', 'weekend', 'choice', '野餐晒太阳', '🧺', '户外活动', 29),
  ('weekend-museum', 'weekend', 'choice', '逛博物馆', '🏛️', '室内活动', 30),
  ('weekend-market', 'weekend', 'choice', '逛周末市集', '🎪', '轻松出门', 31),
  ('weekend-hiking', 'weekend', 'choice', '徒步看风景', '🥾', '户外活动', 32),
  ('weekend-beach', 'weekend', 'choice', '去海边吹风', '🏖️', '短途旅行', 33),
  ('weekend-aquarium', 'weekend', 'choice', '逛水族馆', '🐠', '室内活动', 34),
  ('weekend-bookstore', 'weekend', 'choice', '一起逛书店', '📚', '轻松出门', 35),
  ('weekend-spa', 'weekend', 'choice', '泡温泉放松', '♨️', '短途旅行', 36),
  ('weekend-boardgame', 'weekend', 'choice', '桌游约会', '🎲', '室内活动', 37),
  ('weekend-restaurant', 'weekend', 'choice', '尝一家新餐厅', '🍽️', '美食约会', 38),
  ('apology-hug', 'apology', 'choice', '先抱抱，再一起说', '🫂', '温柔和好', 39),
  ('apology-letter', 'apology', 'choice', '各写一句真心话', '💌', '温柔和好', 40),
  ('apology-rps', 'apology', 'choice', '石头剪刀布决定', '✊', '轻松破冰', 41),
  ('apology-food', 'apology', 'choice', '一起吃顿好吃的再聊', '🍰', '温柔和好', 42),
  ('apology-pause', 'apology', 'choice', '先冷静十分钟', '⏳', '冷静一下', 43),
  ('apology-thanks', 'apology', 'choice', '每人说一件感谢对方的事', '🌷', '温柔和好', 44),
  ('apology-ticket', 'apology', 'choice', '交换一个拥抱券', '🎟️', '轻松破冰', 45),
  ('apology-review', 'apology', 'choice', '一起复盘，不分输赢', '🤝', '认真沟通', 46),
  ('boss-one-each', 'boss', 'choice', '一人决定一件', '🔁', '公平分配', 47),
  ('boss-together', 'boss', 'choice', '重要的事一起决定', '🤝', '公平分配', 48),
  ('boss-rps', 'boss', 'choice', '猜拳赢家决定', '✊', '小游戏决定', 49),
  ('boss-dice', 'boss', 'choice', '掷骰子决定', '🎲', '小游戏决定', 50),
  ('boss-alternate', 'boss', 'choice', '轮到上次没做主的人', '🔄', '公平分配', 51),
  ('boss-vote', 'boss', 'choice', '各提方案再投票', '🗳️', '认真决定', 52),
  ('boss-happy', 'boss', 'choice', '今天让对方开心的人决定', '💗', '甜蜜规则', 53),
  ('boss-again', 'boss', 'choice', '再转一次', '🎡', '小游戏决定', 54),
  ('punish-dishes-table', 'dishes', 'punishment', '洗完后负责擦桌子', '🧽', '小惩罚', 55),
  ('punish-dishes-song', 'dishes', 'punishment', '洗碗时唱一首歌', '🎤', '小惩罚', 56),
  ('punish-movie-snack', 'movie', 'punishment', '输的人准备零食', '🍿', '小惩罚', 57),
  ('punish-movie-phone', 'movie', 'punishment', '不能中途玩手机', '📵', '小惩罚', 58),
  ('punish-weekend-photo', 'weekend', 'punishment', '负责拍一张合照', '📷', '小惩罚', 59),
  ('punish-weekend-memory', 'weekend', 'punishment', '回来后写一句今日回忆', '📝', '小惩罚', 60),
  ('punish-apology-praise', 'apology', 'punishment', '认真夸对方三句', '🥰', '甜蜜任务', 61),
  ('punish-apology-hug', 'apology', 'punishment', '送出一张拥抱券', '🎫', '甜蜜任务', 62),
  ('punish-boss-clean', 'boss', 'punishment', '做主的人也要负责收尾', '🧹', '公平规则', 63),
  ('punish-boss-gift', 'boss', 'punishment', '给对方一个小奖励', '🎁', '甜蜜任务', 64)
ON CONFLICT (id) DO NOTHING;

-- 「今晚吃什么」内置菜单（只读，所有情侣共享）
CREATE TABLE IF NOT EXISTS food_options (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  category TEXT NOT NULL DEFAULT '其他' CHECK (char_length(category) BETWEEN 1 AND 40),
  emoji TEXT NOT NULL DEFAULT '🍱' CHECK (char_length(emoji) <= 16),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (name, category)
);

ALTER TABLE food_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "food catalog readable by signed-in users" ON food_options;
CREATE POLICY "food catalog readable by signed-in users" ON food_options
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO food_options (name, category, emoji, sort_order) VALUES
  ('火锅', '基础美食', '🍲', 1),
  ('烤肉', '基础美食', '🥩', 2),
  ('寿司', '基础美食', '🍣', 3),
  ('披萨', '基础美食', '🍕', 4),
  ('拉面', '基础美食', '🍜', 5),
  ('麻辣烫', '基础美食', '🌶️', 6),
  ('汉堡', '基础美食', '🍔', 7),
  ('炸鸡', '基础美食', '🍗', 8),
  ('海鲜', '基础美食', '🦞', 9),
  ('烧烤', '基础美食', '🍢', 10),
  ('过桥米线', '云南特色', '🍜', 11),
  ('汽锅鸡', '云南特色', '🍗', 12),
  ('宣威火腿', '云南特色', '🥓', 13),
  ('鲜花饼', '云南特色', '🌸', 14),
  ('饵块', '云南特色', '🍚', 15),
  ('豆焖饭', '云南特色', '🍛', 16),
  ('野生菌火锅', '云南特色', '🍄', 17),
  ('酸汤鱼', '云南特色', '🐟', 18),
  ('凉鸡米线', '云南特色', '🍜', 19),
  ('烧饵块', '云南特色', '🍘', 20),
  ('罐罐米线', '云南特色', '🥘', 21),
  ('蒙自年糕', '云南特色', '🍡', 22),
  ('建水豆腐', '云南特色', '🧈', 23),
  ('乳扇', '云南特色', '🥛', 24),
  ('喜洲粑粑', '云南特色', '🥞', 25),
  ('腾冲饵丝', '云南特色', '🍜', 26),
  ('大救驾', '云南特色', '🍽️', 27),
  ('菠萝饭', '云南特色', '🍍', 28),
  ('竹筒饭', '云南特色', '🎋', 29),
  ('烤乳猪', '云南特色', '🐷', 30),
  ('撒撇', '云南特色', '🥗', 31),
  ('傣味酸笋', '云南特色', '🥬', 32),
  ('香茅草烤鱼', '云南特色', '🐟', 33),
  ('舂鸡脚', '云南特色', '🍗', 34),
  ('云腿月饼', '云南特色', '🥮', 35),
  ('卤饵丝', '云南特色', '🍜', 36),
  ('鸡枞菌', '云南特色', '🍄', 37),
  ('松茸炖鸡', '云南特色', '🍗', 38),
  ('酸汤鱼', '贵州特色', '🐟', 39),
  ('羊肉粉', '贵州特色', '🍜', 40),
  ('肠旺面', '贵州特色', '🍜', 41),
  ('丝娃娃', '贵州特色', '🌯', 42),
  ('豆腐圆子', '贵州特色', '⚪', 43),
  ('牛肉粉', '贵州特色', '🍜', 44),
  ('折耳根', '贵州特色', '🥬', 45),
  ('糯米饭', '贵州特色', '🍚', 46),
  ('青岩猪脚', '贵州特色', '🦶', 47),
  ('苗家酸汤', '贵州特色', '🥘', 48),
  ('辣子鸡', '贵州特色', '🐔', 49),
  ('红酸汤', '贵州特色', '🥘', 50),
  ('豆米火锅', '贵州特色', '🍲', 51),
  ('烙锅', '贵州特色', '🍳', 52),
  ('鸡辣子', '贵州特色', '🌶️', 53),
  ('状元蹄', '贵州特色', '🦶', 54),
  ('花溪牛肉粉', '贵州特色', '🍜', 55),
  ('恋爱豆腐果', '贵州特色', '💕', 56),
  ('炒饵块', '贵州特色', '🍘', 57),
  ('遵义羊肉粉', '贵州特色', '🐑', 58),
  ('凯里酸汤鱼', '贵州特色', '🐟', 59),
  ('镇宁波波糖', '贵州特色', '🍬', 60),
  ('威宁荞酥', '贵州特色', '🍪', 61),
  ('昭通小肉串', '昭通特色', '🍢', 62),
  ('昭通酱', '昭通特色', '🥫', 63),
  ('油糕稀豆粉', '昭通特色', '🥞', 64),
  ('昭通天麻炖鸡', '昭通特色', '🍗', 65),
  ('昭通苹果', '昭通特色', '🍎', 66),
  ('洋芋粑粑', '昭通特色', '🥔', 67),
  ('镇雄小碗红糖', '昭通特色', '🍯', 68),
  ('彝良天麻', '昭通特色', '🌿', 69),
  ('威信扎染', '昭通特色', '🎨', 70),
  ('盐津豆腐干', '昭通特色', '🧈', 71),
  ('大关筇竹笋', '昭通特色', '🎋', 72),
  ('永善花椒', '昭通特色', '🌶️', 73),
  ('绥江半边红李子', '昭通特色', '🍑', 74),
  ('巧家小碗红糖', '昭通特色', '🍯', 75),
  ('鲁甸樱桃', '昭通特色', '🍒', 76),
  ('昭阳烧洋芋', '昭通特色', '🥔', 77),
  ('镇雄洋芋鸡', '昭通特色', '🐔', 78),
  ('彝良麻辣洋芋', '昭通特色', '🥔', 79),
  ('威信手工面', '昭通特色', '🍜', 80),
  ('盐津乌骨鸡', '昭通特色', '🐔', 81),
  ('大关黄牛肉', '昭通特色', '🥩', 82),
  ('永善松露', '昭通特色', '🍄', 83),
  ('绥江花生', '昭通特色', '🥜', 84),
  ('巧家核桃', '昭通特色', '🌰', 85),
  ('昭通炒洋芋', '昭通特色', '🥔', 86),
  ('昭通羊汤锅', '昭通特色', '🍲', 87),
  ('昭通卷粉', '昭通特色', '🌯', 88),
  ('昭通凉粉', '昭通特色', '🥤', 89),
  ('昭通米线', '昭通特色', '🍜', 90),
  ('昭通烧烤', '昭通特色', '🍢', 91),
  ('昭通饵块', '昭通特色', '🍘', 92),
  ('昭通臭豆腐', '昭通特色', '🧈', 93),
  ('昭通豆花米线', '昭通特色', '🍜', 94),
  ('昭通锅巴洋芋', '昭通特色', '🥔', 95),
  ('昭通烤鸡', '昭通特色', '🍗', 96),
  ('昭通凉拌鸡', '昭通特色', '🐔', 97),
  ('昭通火腿', '昭通特色', '🥓', 98),
  ('昭通腊肉', '昭通特色', '🥓', 99),
  ('昭通香肠', '昭通特色', '🌭', 100),
  ('昭通酸菜鱼', '昭通特色', '🐟', 101),
  ('昭通水煮鱼', '昭通特色', '🐟', 102),
  ('昭通毛豆腐', '昭通特色', '🧈', 103)
ON CONFLICT (name, category) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 情侣默契问答
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS couple_quiz (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array'),
  correct_answer TEXT NOT NULL CHECK (char_length(correct_answer) BETWEEN 1 AND 200),
  category TEXT CHECK (category IS NULL OR char_length(category) <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS couple_quiz_couple_idx ON couple_quiz(couple_id, created_at);

SELECT apply_couple_policies('couple_quiz');

CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  quiz_id BIGINT NOT NULL REFERENCES couple_quiz(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_results_couple_idx ON quiz_results(couple_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS quiz_results_quiz_idx ON quiz_results(quiz_id);

SELECT apply_couple_policies('quiz_results');

DROP POLICY IF EXISTS "quiz player in couple" ON quiz_results;
CREATE POLICY "quiz player in couple" ON quiz_results AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (is_couple_member(player_id));

-- ---------------------------------------------------------------------------
-- 真心话大冒险（内置题目在 app/truth-or-dare/page.tsx 中，这里只存自定义题目）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truth_or_dare (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('truth', 'dare')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_custom BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS truth_or_dare_couple_idx ON truth_or_dare(couple_id, created_at DESC);

SELECT apply_couple_policies('truth_or_dare');

DROP POLICY IF EXISTS "truth or dare creator in couple" ON truth_or_dare;
CREATE POLICY "truth or dare creator in couple" ON truth_or_dare AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (created_by IS NULL OR is_couple_member(created_by));

-- ---------------------------------------------------------------------------
-- 功能申请箱
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_requests (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) <= 5000),
  requester UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feature_requests_couple_idx ON feature_requests(couple_id, created_at DESC);

SELECT apply_couple_policies('feature_requests');

DROP POLICY IF EXISTS "feature requester in couple" ON feature_requests;
CREATE POLICY "feature requester in couple" ON feature_requests AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (requester IS NULL OR is_couple_member(requester));

DROP TRIGGER IF EXISTS feature_requests_touch ON feature_requests;
CREATE TRIGGER feature_requests_touch BEFORE UPDATE ON feature_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- 星座运势 / 塔罗占卜
-- ---------------------------------------------------------------------------
-- user_id 为运势所属的人（可以是自己，也可以是另一半）
CREATE TABLE IF NOT EXISTS horoscope_readings (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zodiac_sign TEXT NOT NULL CHECK (char_length(zodiac_sign) BETWEEN 1 AND 20),
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  love_fortune TEXT NOT NULL,
  lucky_color TEXT NOT NULL,
  lucky_number INTEGER NOT NULL,
  compatibility_score INTEGER NOT NULL,
  daily_advice TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS horoscope_readings_couple_idx
  ON horoscope_readings(couple_id, user_id, reading_date DESC);

SELECT apply_couple_policies('horoscope_readings');

DROP POLICY IF EXISTS "horoscope owner in couple" ON horoscope_readings;
CREATE POLICY "horoscope owner in couple" ON horoscope_readings AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (is_couple_member(user_id));

-- 每对情侣每天共用一次抽牌，user_id 记录抽牌的人
CREATE TABLE IF NOT EXISTS tarot_readings (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  card_meaning TEXT NOT NULL,
  card_advice TEXT NOT NULL,
  love_fortune TEXT NOT NULL,
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tarot_readings_couple_idx ON tarot_readings(couple_id, reading_date DESC);

SELECT apply_couple_policies('tarot_readings');

DROP POLICY IF EXISTS "tarot drawer in couple" ON tarot_readings;
CREATE POLICY "tarot drawer in couple" ON tarot_readings AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR is_couple_member(user_id));

-- ---------------------------------------------------------------------------
-- 换装作品墙（旧版为全站共享画廊，现在只对本情侣可见）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dress_up_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  outfit JSONB NOT NULL CHECK (jsonb_typeof(outfit) = 'object'),
  liked_by UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dress_up_outfits_couple_idx ON dress_up_outfits(couple_id, created_at DESC);

SELECT apply_couple_policies('dress_up_outfits');

DROP POLICY IF EXISTS "outfit creator is self" ON dress_up_outfits;
CREATE POLICY "outfit creator is self" ON dress_up_outfits AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

ALTER TABLE dress_up_outfits REPLICA IDENTITY FULL;
SELECT add_to_realtime('dress_up_outfits');

-- 点赞/取消点赞：只用 auth.uid()，只能操作本情侣的作品
CREATE OR REPLACE FUNCTION toggle_dress_up_outfit_like(p_outfit_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_likes UUID[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION '请先登录' USING ERRCODE = '28000';
  END IF;

  UPDATE dress_up_outfits
  SET liked_by = CASE
    WHEN v_user = ANY(liked_by) THEN array_remove(liked_by, v_user)
    ELSE array_append(liked_by, v_user)
  END
  WHERE id = p_outfit_id
    AND couple_id = current_couple_id()
  RETURNING liked_by INTO v_likes;

  IF v_likes IS NULL THEN
    RAISE EXCEPTION '作品不存在';
  END IF;
  RETURN v_likes;
END;
$$;

REVOKE ALL ON FUNCTION toggle_dress_up_outfit_like(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION toggle_dress_up_outfit_like(UUID) TO authenticated;
