-- 05-games-music.sql
-- 用途：「游戏与音乐」功能组的表结构、情侣隔离 RLS 与 Realtime 配置（全新库）。
-- 依赖：必须先执行 01-core-auth.sql（couples、current_couple_id()、apply_couple_policies()、
--       add_to_realtime()、touch_updated_at()）。
-- 幂等：只使用 CREATE ... IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS，
--       不 DROP TABLE、不 TRUNCATE、不删除数据。
--
-- 包含的表与对应页面：
--   gomoku_games        /gomoku、/gomoku/[id]          五子棋房间（Realtime）
--   mahjong_games       /mahjong、/mahjong/[id]        麻将牌桌（Realtime）
--   user_balances       /mahjong                       欢乐豆余额（每人一行，仅前端体验数据）
--   monopoly_rooms      /monopoly、/monopoly/[id]      大富翁在线房间（Realtime）
--   rps_games           /rock-paper-scissors           石头剪刀布战绩
--   drawings            /drawing                       你画我猜作品
--   songs               /music-player、全局播放器       共享歌单（Realtime）
--   pinned_artists      /music-player                  置顶歌手（Realtime）
--   music_sync_session  全局播放器「一起听」            每对情侣一行的播放同步状态（Realtime）
--
-- 说明：
--   * 所有表都带 couple_id（默认 current_couple_id()），并通过 apply_couple_policies() 只允许
--     本情侣成员读写。前端插入时不传 couple_id。
--   * players / game_state 等 JSONB 中会出现电脑玩家 ID（如 'bot-1'、'bot_1'、'empty_1'），
--     它们只存在于 JSON 里；表上的身份列（host_id、guest_id、player1 等）都是真实用户 UUID。
--   * 游戏状态、胜负和余额都由客户端计算并写入，不是可信结算或授权依据。

-- ---------------------------------------------------------------------------
-- 五子棋
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gomoku_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  host_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  game_mode TEXT NOT NULL DEFAULT 'pvp' CHECK (game_mode IN ('pvp', 'pve')),
  -- [{ id, name, avatar, color, isBot }]；电脑玩家 id 为 'bot-1'
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gomoku_games_couple_idx ON gomoku_games (couple_id);
CREATE INDEX IF NOT EXISTS gomoku_games_status_created_idx ON gomoku_games (couple_id, status, created_at DESC);

SELECT apply_couple_policies('gomoku_games');
-- Realtime UPDATE 需要带上完整 JSONB
ALTER TABLE gomoku_games REPLICA IDENTITY FULL;
SELECT add_to_realtime('gomoku_games');

-- ---------------------------------------------------------------------------
-- 麻将
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mahjong_games (
  -- 前端用 crypto.randomUUID() 生成 id 后插入
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  host_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'sichuan')),
  base_multiplier INTEGER NOT NULL DEFAULT 1 CHECK (base_multiplier > 0),
  -- [{ id, name, avatar, isBot }]；电脑牌友 id 为 'bot_1'..'bot_3'，空座位为 'empty_N'
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mahjong_games_couple_idx ON mahjong_games (couple_id);
CREATE INDEX IF NOT EXISTS mahjong_games_status_created_idx ON mahjong_games (couple_id, status, created_at DESC);

SELECT apply_couple_policies('mahjong_games');
ALTER TABLE mahjong_games REPLICA IDENTITY FULL;
SELECT add_to_realtime('mahjong_games');

-- 欢乐豆余额：每个用户在其情侣空间里一行。
-- 注意：余额只是前端娱乐体验数据，由客户端读写，不是可信结算，不能用于任何真实价值。
-- 当前前端只读取；没有行时显示默认 1000。不再预置全局种子行。
CREATE TABLE IF NOT EXISTS user_balances (
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (couple_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_balances_couple_idx ON user_balances (couple_id);
CREATE INDEX IF NOT EXISTS user_balances_user_idx ON user_balances (user_id);

DROP TRIGGER IF EXISTS user_balances_touch ON user_balances;
CREATE TRIGGER user_balances_touch BEFORE UPDATE ON user_balances
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

SELECT apply_couple_policies('user_balances');

-- ---------------------------------------------------------------------------
-- 大富翁在线房间
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monopoly_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL CHECK (room_code ~ '^[A-Z0-9]{6}$'),
  host_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  host_name TEXT NOT NULL CHECK (char_length(host_name) BETWEEN 1 AND 40),
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT CHECK (guest_name IS NULL OR char_length(guest_name) BETWEEN 1 AND 40),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  game_state JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (guest_id IS NULL OR guest_id <> host_id),
  -- 房间码在情侣空间内唯一（RLS 下看不到别人的房间，全局唯一会产生无法解释的冲突）
  UNIQUE (couple_id, room_code)
);

CREATE INDEX IF NOT EXISTS monopoly_rooms_couple_idx ON monopoly_rooms (couple_id);
CREATE INDEX IF NOT EXISTS monopoly_rooms_status_created_idx ON monopoly_rooms (couple_id, status, created_at DESC);

SELECT apply_couple_policies('monopoly_rooms');
ALTER TABLE monopoly_rooms REPLICA IDENTITY FULL;
SELECT add_to_realtime('monopoly_rooms');

-- ---------------------------------------------------------------------------
-- 石头剪刀布战绩（对手出拳由前端随机模拟；player2 记为另一半）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rps_games (
  id BIGSERIAL PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  player1 UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  player2 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player1_choice TEXT NOT NULL CHECK (player1_choice IN ('rock', 'paper', 'scissors')),
  player2_choice TEXT NOT NULL CHECK (player2_choice IN ('rock', 'paper', 'scissors')),
  -- NULL 表示平局
  winner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rps_games_couple_played_idx ON rps_games (couple_id, played_at DESC);

SELECT apply_couple_policies('rps_games');

-- ---------------------------------------------------------------------------
-- 你画我猜作品
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drawings (
  id BIGSERIAL PRIMARY KEY,
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  -- 画家：可以是自己或另一半（同一设备轮流画）
  drawer UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  -- base64 PNG data URL
  image_data TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS drawings_couple_created_idx ON drawings (couple_id, created_at DESC);

SELECT apply_couple_policies('drawings');

-- ---------------------------------------------------------------------------
-- 音乐播放器
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT NOT NULL,
  cover TEXT,
  source TEXT NOT NULL DEFAULT 'file' CHECK (source IN ('file', 'spotify', 'youtube')),
  added_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  liked BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS songs_couple_created_idx ON songs (couple_id, created_at);
CREATE INDEX IF NOT EXISTS songs_couple_pinned_idx ON songs (couple_id, pinned, pinned_at);

SELECT apply_couple_policies('songs');
SELECT add_to_realtime('songs');

CREATE TABLE IF NOT EXISTS pinned_artists (
  couple_id UUID NOT NULL DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 前端 upsert 使用 onConflict: 'couple_id,artist'
  PRIMARY KEY (couple_id, artist)
);

CREATE INDEX IF NOT EXISTS pinned_artists_couple_idx ON pinned_artists (couple_id, pinned_at);

SELECT apply_couple_policies('pinned_artists');
SELECT add_to_realtime('pinned_artists');

-- 「一起听」：每对情侣一行（旧库是 id = 'default' 的全局单行）。
-- 前端 upsert 使用 onConflict: 'couple_id'，couple_id 由默认值填充。
-- updated_by 存的是浏览器标签页的随机 client id（用来忽略自己的回声），不是用户 ID，因此保留 TEXT。
CREATE TABLE IF NOT EXISTS music_sync_session (
  couple_id UUID PRIMARY KEY DEFAULT current_couple_id() REFERENCES couples(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  position_seconds NUMERIC NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT apply_couple_policies('music_sync_session');
SELECT add_to_realtime('music_sync_session');
