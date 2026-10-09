# 数据库脚本说明

`database/setup/` 下的脚本面向**全新的** Supabase 项目。在 SQL Editor 中按编号顺序逐个执行；每个脚本都是幂等的，失败修正后可以重新执行。脚本不会自动执行，也不兼容旧版"我们的小世界"的公开 RLS 数据库。

## 执行顺序

| 顺序 | 文件 | 内容 | 对应页面 |
| --- | --- | --- | --- |
| 1 | `setup/01-core-auth.sql` | `user_profiles`、`couples`、`couple_members`；注册触发器；`create_couple` / `join_couple` / `leave_couple`；`current_couple_id()`、`is_couple_member()` 等 RLS 辅助函数；`apply_couple_policies()`、`add_to_realtime()`；`photos` / `avatars` bucket 与 Storage 策略 | 登录、配对、设置、个人资料、全局头像 |
| 2 | `setup/02-memories.sql` | `photos`、`diary_entries`、`love_notes`、`anniversaries`、`memory_places`、`novels`、`love_quotes`；只读目录 `love_quote_library`（含内置情话） | 首页、相册、日记、留言、纪念日、回忆地图、小说、情话 |
| 3 | `setup/03-plans-life.sql` | `check_ins`、`mood_records`、`outfit_records`、`schedules`、`countdowns`、`time_capsules`、`wishlist`、`love_bucket_list`、`shared_expenses`、`reminders` | 签到、心情、穿搭记录、日程、倒计时、时光胶囊、愿望清单、100 件事、账本、个人资料提醒 |
| 4 | `setup/04-interactions.sql` | `chat_messages`、`couple_notifications`、`couple_gifts`、`couple_growth`、`decision_options`、`couple_quiz`、`quiz_results`、`truth_or_dare`、`feature_requests`、`horoscope_readings`、`tarot_readings`、`dress_up_outfits`；只读目录 `food_options`、`decision_option_presets`；RPC `toggle_dress_up_outfit_like` | 聊天、通知、情侣空间、万能转盘、情侣测试、真心话大冒险、功能许愿、星座、塔罗、换装 |
| 5 | `setup/05-games-music.sql` | `gomoku_games`、`mahjong_games`、`user_balances`、`monopoly_rooms`、`rps_games`、`drawings`、`songs`、`pinned_artists`、`music_sync_session` | 五子棋、麻将、大富翁、石头剪刀布、你画我猜、音乐播放器 |

## 隔离规则

- 业务表都带 `couple_id UUID NOT NULL DEFAULT current_couple_id()`，前端插入时**不传** `couple_id`。
- `apply_couple_policies('<table>')` 创建统一策略：只有本情侣成员可以读写。部分表另外有 RESTRICTIVE 插入策略，要求发送者 / 创建者等于 `auth.uid()`、收件人属于本情侣。
- 身份列（作者、发送者、玩家等）存 Auth 用户 UUID。
- 只读目录表（`love_quote_library`、`food_options`、`decision_option_presets`）不带 `couple_id`，登录用户只能读，内容只能通过 SQL 维护。
- `couples` / `couple_members` 只能通过 SECURITY DEFINER 函数写入。

## 新增表时

1. 在对应编号的文件里追加，或新建下一个编号的文件。
2. 加 `couple_id` 列和索引，执行 `SELECT apply_couple_policies('<table>')`；需要实时同步再执行 `SELECT add_to_realtime('<table>')`。
3. 不要创建 `USING (true)` 的写策略。
4. 更新本文件的表格。

## 风险

- `leave_couple()`：最后一个成员离开时会删除 `couples` 行，所有带 `couple_id` 的业务数据随之**级联删除，无法恢复**。
- 时光胶囊收件人与开启时间、游戏状态、胜负、余额、共同养成经验值都由浏览器写入，只在情侣两人之间生效，不是可信授权或结算。
- `photos`、`avatars` 是公开读取的 bucket，拿到完整 URL 的人都能查看图片。
- 一方解除配对后，另一方数据中的身份列仍是对方 UUID，界面显示为「Ta」。
