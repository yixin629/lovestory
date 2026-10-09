# Supabase 配置指南

本项目需要一个**全新的** Supabase 项目。下面的脚本面向空库，不兼容旧版"我们的小世界"的公开 RLS 数据库。

## 1. 创建项目并获取客户端配置

1. 在 [supabase.com](https://supabase.com) 注册并新建 Project，Region 选离用户最近的区域，数据库密码自己保管。
2. 打开 Project Settings > API，复制：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `service_role` 密钥本项目不需要，不要放进任何客户端变量。

## 2. 配置 Auth

1. Authentication > Sign In / Providers：保持 Email 已启用。默认开启 "Confirm email"，用户注册后要先点验证邮件才能登录；只是自己测试的话可以暂时关掉。
2. Authentication > URL Configuration：
   - Site URL：正式网站地址（例如 `https://lovestory.vercel.app`）
   - Redirect URLs：`https://<正式域名>/login`、`https://<正式域名>/settings`，本地开发加 `http://localhost:3000/**`
3. Supabase 自带的邮件服务每小时发送量很低，只适合测试。正式给别人用之前，在 Authentication > Emails > SMTP Settings 配置自己的 SMTP（例如 Resend、SendGrid）。

## 3. 初始化数据库

在 SQL Editor 中按编号顺序逐个执行 `database/setup/` 下的全部脚本。`01-core-auth.sql` 必须最先执行，因为后面的脚本都依赖它定义的函数（`current_couple_id()`、`apply_couple_policies()`、`add_to_realtime()`）。

每个脚本都是幂等的，执行失败时修正问题后可以重新执行。各脚本包含的表和对应页面见 [数据库脚本说明](../../database/README.md)。

## 4. Storage

`01-core-auth.sql` 会自动创建两个公开读取的 bucket 和写入策略：

| bucket | 路径 | 谁能写 |
| --- | --- | --- |
| `photos` | `<couple_id>/<文件>` | 本情侣成员 |
| `avatars` | `<user_id>/<文件>` | 用户本人 |

公开 bucket 意味着拿到完整 URL 的人都能查看图片；URL 里含随机 UUID，无法枚举。如果以后需要更严格的隐私，要改成私有 bucket + `createSignedUrl`。

## 5. Realtime

脚本已经把需要实时同步的表加入 `supabase_realtime` publication。postgres_changes 订阅同样受 RLS 限制。broadcast / presence 频道没有数据库鉴权，代码统一用 `coupleChannel()` 在频道名里加入情侣 ID。

## 6. 验证

1. 用两个邮箱分别注册。
2. A 登录后在 `/pair` 创建情侣空间，复制邀请码。
3. B 登录后输入邀请码完成配对。
4. 两人互相能看到对方发的聊天、照片和日记；再注册第三个账号并新建空间，确认看不到 A、B 的任何数据。

## 常见问题

### `relation ... does not exist` / `column ... does not exist`

有 setup 脚本没执行或执行失败。按顺序重新执行即可。

### `new row violates row-level security policy`

当前账号还没配对，或者插入时手动传了别人的 `couple_id`。业务代码不要传 `couple_id`，由数据库默认值填写。

### Storage 上传失败

确认上传路径的第一级目录是当前情侣 ID（照片）或当前用户 ID（头像）。

### 注册收不到邮件

检查垃圾箱；内置邮件服务有频率限制，正式使用请配置 SMTP。

## 安全边界

- 认证和数据隔离由 Supabase Auth + RLS 保证；页面上的限制（时光胶囊开启时间、游戏胜负、余额等）只在情侣内部生效，不是可信授权。
- 解除配对时，如果你是空间里最后一个成员，整个情侣空间及其全部数据会被级联删除，无法恢复。
- 密钥疑似泄露时，在 Project Settings > API 轮换密钥，并同步更新 Vercel 环境变量后重新部署。
