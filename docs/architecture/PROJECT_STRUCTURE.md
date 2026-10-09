# 项目结构说明

本文档说明当前仓库的目录职责。运行和部署方法以根目录 [README.md](../../README.md) 为准。

## 顶层结构

```text
.
├── .github/workflows/ci.yml   # GitHub Actions：lint、类型检查与构建
├── .gitattributes             # 统一 LF 换行（.bat 保持 CRLF）
├── app/                       # Next.js App Router 应用
├── hooks/                     # 通用 React Hooks
├── lib/                       # 服务客户端、功能注册表与工具函数
├── database/                  # Supabase/PostgreSQL 脚本
│   └── setup/                 # 新库初始化（按编号顺序执行）
├── docs/                      # 分类文档
│   ├── getting-started/       # 安装和服务配置
│   ├── guides/                # 功能指南
│   ├── architecture/          # 架构与目录说明
├── scripts/                   # 本地验证与维护脚本
├── patches/                   # 安全依赖兼容补丁
├── eslint.config.mjs          # ESLint 9 Flat Config
├── AGENTS.md                  # AI 开发协作规则
├── README.md                  # 项目入口
├── .env.local.example         # 环境变量名称模板
├── package.json               # npm 依赖与命令
├── next.config.js             # Next.js 配置
├── open-next.config.ts        # OpenNext Cloudflare 适配配置
├── cloudflare-env.d.ts        # Wrangler 生成的 Worker binding 与运行时类型
├── tailwind.config.ts         # Tailwind CSS 配置
├── tsconfig.json              # TypeScript 配置
└── wrangler.toml              # Cloudflare 配置
```

## 应用结构

`app/` 中每个带 `page.tsx` 的目录对应一个页面路由，例如：

```text
app/
├── page.tsx                   # 首页
├── layout.tsx                 # 根布局与全局 Provider
├── loading.tsx                # 路由切换时的全局加载反馈
├── error.tsx                  # 页面渲染异常兜底
├── not-found.tsx              # 404 页面
├── globals.css                # 全局样式和主题
├── api/
│   ├── chat/route.ts          # AI 聊天服务端接口
│   ├── lyrics/route.ts        # 音乐播放器歌词查询
│   ├── youtube-search/route.ts # 音乐播放器 YouTube 站内搜索
├── components/
│   ├── ai-chat/               # AI 聊天浮层、客户端与本地回复
│   ├── avatar/                # 头像选择
│   ├── feedback/              # Toast 等反馈组件
│   ├── home/                  # 首页专用展示组件
│   ├── layout/                # 导航和全局布局组件
│   ├── providers/             # 根级 Provider 与访问守卫
│   └── ui/                    # 跨功能基础 UI
├── photos/
│   ├── page.tsx               # /photos
│   ├── components/            # 相册专用组件
│   ├── lib/                   # 图片压缩等相册专用工具
│   └── types.ts               # 相册数据类型
├── expenses/
│   ├── page.tsx               # /expenses
│   └── components/            # 账本专用统计与空状态
├── dress-up/
│   ├── page.tsx               # /dress-up
│   ├── constants.ts           # 穿搭选项与场景数据
│   └── lib/                   # 穿搭专用工具
├── diary/page.tsx             # /diary
├── gomoku/
│   ├── page.tsx               # /gomoku
│   ├── [id]/page.tsx          # /gomoku/:id
│   └── engine/                # 五子棋规则逻辑
├── mahjong/
│   ├── page.tsx               # /mahjong
│   ├── [id]/page.tsx          # /mahjong/:id
│   ├── components/            # 麻将专用组件
│   └── engine/                # 麻将规则逻辑
├── login/page.tsx             # /login：邮箱注册、登录、找回密码
└── pair/page.tsx              # /pair：创建情侣空间或输入邀请码配对
```

跨页面 UI 按职责放入 `app/components/` 的子目录；只服务某个功能的组件、类型、常量和引擎代码应保留在该功能目录内。

`lib/features.ts` 是首页和导航共用的功能注册表。登录页、动态房间详情和 API 路由不作为独立产品入口登记。

## 公共代码

- `app/components/providers/AuthProvider.tsx`：Supabase Auth 会话、情侣 ID、本人与另一半资料，以及登录 / 配对跳转守卫。
- `hooks/useAuth.ts`：读取 AuthProvider 的状态（`user`、`me`、`partner`、`coupleId`、`nameOf()` 等）。
- `lib/anniversaries.ts`：解析本地纪念日日期并计算下一次发生时间。
- `lib/couple-interactions.ts`：情侣 Realtime 频道命名与双人通知写入。
- `lib/auth-fetch.ts`：客户端调用 `/api/*` 时附带登录令牌。
- `lib/server-auth.ts`：API Route 校验登录（server-only）。
- `lib/user-profiles.ts`：更新当前用户头像。
- `lib/supabase.ts`：创建前端 Supabase 客户端。
- `lib/features.ts`：统一登记功能名称、路由、分类以及首页和导航的展示方式。

新增无 UI 的逻辑时，单功能代码先放该路由的 `lib/`；确认跨功能复用后再提升到根 `hooks/` 或 `lib/`，避免页面文件继续膨胀。

## 数据与身份边界

- 浏览器页面通过 `lib/supabase.ts` 使用匿名客户端访问 Supabase。
- 用户通过 Supabase Auth 邮箱注册登录，两人用邀请码配对成一个情侣空间（`couples`、`couple_members`）。
- 每张业务表带 `couple_id`（默认 `current_couple_id()`），RLS 只允许本情侣成员读写；身份列存 Auth 用户 UUID。
- `app/api/` 下的路由先校验登录，再在服务端读取 AI、YouTube 密钥，不把密钥返回客户端。
- 相册使用 `photos` bucket（路径 `<couple_id>/...`），头像使用 `avatars` bucket（路径 `<user_id>/...`）；两者公开读取、按目录限制写入。

## 数据库脚本

数据库脚本的选择和风险说明见 [database/README.md](../../database/README.md)。

全新数据库按编号顺序执行 `database/setup/` 下的全部脚本，`01-core-auth.sql` 必须最先执行。

## 文档结构

文档入口位于 [docs/README.md](../README.md)：

- `getting-started/` 只放当前仍适用的安装和配置步骤。
- `guides/` 放具体功能使用或部署说明。
- `architecture/` 放项目结构和技术设计。

部署说明统一维护在 [部署与持续集成](../getting-started/DEPLOYMENT.md)，不要把 Cloudflare Dashboard 命令分散复制到历史报告。

## 配置和环境

本地配置从 `.env.local.example` 复制到 `.env.local`。基础变量：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

可选的服务端变量（AI 聊天、YouTube 搜索）见 `.env.local.example` 和 [部署与持续集成](../getting-started/DEPLOYMENT.md#环境变量)。这些密钥只应存在于 `.env.local` 或部署平台的环境变量中，不得提交到仓库。

## 开发命令

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
npm run check
npm run cf:build
npm run cf-typegen
npm start
```

`npm run check` 依次运行 lint、类型检查和标准 Next.js 生产构建；
`npm run cf:build` 额外把产物转换为 Cloudflare Worker，二者用途不同。
`npm run cf-typegen` 从 `wrangler.toml` 和无敏感值的 `.env.local.example`
重新生成 `cloudflare-env.d.ts`。

## 添加新功能

1. 在 `app/<route>/page.tsx` 创建页面。
2. 功能专用代码放入 `app/<route>/components`、`lib`、`engine` 或 `types`；确认跨页面复用后再放入 `app/components/`。
3. 如需数据表，在 `database/migrations/` 新建独立、尽量可重复执行的 SQL。
4. 在 `lib/features.ts` 登记入口，由首页和导航共同读取。
5. 更新根 `README.md` 或相应 `docs/guides/` 文档。
6. 运行 lint 和类型检查；涉及路由、配置或生产行为时运行生产构建。
7. 目标包含 Cloudflare Workers 时，再运行 `npm run cf:build`。
