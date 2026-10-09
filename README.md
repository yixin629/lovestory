# lovestory · 我们的小世界

一个使用 Next.js、TypeScript、Tailwind CSS 和 Supabase 开发的情侣网站。任何人都可以用邮箱注册，再用邀请码和另一半配对，拥有一个只属于两个人的空间，在里面记录生活、管理计划、分享照片、玩双人小游戏。

## 主要功能

- 账号：邮箱注册、登录、找回密码；邀请码配对；解除配对
- 生活记录：照片、日记、留言、心情、纪念日、签到、穿搭和共同账本
- 共同计划：日程、倒计时、心愿清单、愿望清单、时光胶囊
- 双人互动：聊天、情书、甜言蜜语、情侣测试、答案之书、真心话大冒险、礼物箱
- 游戏娱乐：五子棋、麻将、大富翁、你画我猜、记忆翻牌、石头剪刀布等
- 个性体验：个人资料、主题设置、音乐播放器、塔罗和星座
- AI 助手：登录后通过服务端 API 调用已配置的模型服务

功能名称、路径和分类统一登记在 `lib/features.ts`。

## 数据隔离

- 身份来自 Supabase Auth。用户注册后会自动生成 `user_profiles` 资料行。
- 两个用户通过 `create_couple()` / `join_couple(code)` 组成一个情侣空间，一个用户同一时间只能属于一个空间。
- 每张业务表都带 `couple_id`，由数据库默认值自动填写；RLS 只允许本情侣的两位成员读写。
- 照片存放在 `photos/<couple_id>/`，头像存放在 `avatars/<user_id>/`。两个 bucket 都是公开读取（URL 不可猜测），写入受策略限制。
- `/api/*` 需要登录令牌。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| Web 框架 | Next.js 16（App Router、Turbopack） |
| 开发语言 | TypeScript、React 19 |
| 样式 | Tailwind CSS |
| 账号与数据 | Supabase（Auth、PostgreSQL、Realtime、Storage） |
| 部署 | Vercel（也保留 OpenNext + Cloudflare Workers 配置） |

## 快速开始

### 1. 安装依赖

需要 Node.js 20.9 或更高版本。

```bash
npm ci
```

### 2. 创建 Supabase 项目并初始化数据库

在 Supabase Dashboard 的 SQL Editor 中**按编号顺序**执行 `database/setup/` 下的全部脚本，详见 [数据库脚本说明](./database/README.md)。脚本会同时创建 `photos`、`avatars` 两个 Storage bucket 和对应策略。

### 3. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，至少填写：

```env
NEXT_PUBLIC_SUPABASE_URL=你的项目地址
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的匿名访问密钥
```

AI 聊天和 YouTube 搜索是可选的服务端变量。不要提交 `.env.local` 或任何真实密钥。

### 4. 配置 Auth 跳转地址

在 Supabase Dashboard > Authentication > URL Configuration 中把 Site URL 设为网站地址，并在 Redirect URLs 里加入 `<网站地址>/login` 和 `<网站地址>/settings`。本地开发时加入 `http://localhost:3000/**`。

### 5. 启动

```bash
npm run dev
```

打开 <http://localhost:3000>，注册账号 → 创建情侣空间 → 把邀请码发给另一半 → 对方注册后输入邀请码。

## 常用命令

```bash
npm run dev        # 本地开发
npm run lint       # ESLint
npm run typecheck  # TypeScript 检查
npm run check      # lint + typecheck + 生产构建
```

## 文档

- [文档索引](./docs/README.md)
- [Supabase 配置](./docs/getting-started/SUPABASE_SETUP.md)
- [部署与持续集成](./docs/getting-started/DEPLOYMENT.md)
- [项目结构说明](./docs/architecture/PROJECT_STRUCTURE.md)
- [数据库脚本说明](./database/README.md)
- [AI 开发规则](./AGENTS.md)
