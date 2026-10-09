# AGENTS.md

本文件是本仓库唯一的 AI/自动化开发规则入口。任何 AI 在读取、创建、移动、修改或删除文件前，都必须先完整阅读本文件，再阅读根目录 `README.md` 和与任务直接相关的代码与文档。

用户当前任务优先于本文件；实际代码、`package.json` 和平台配置优先于历史报告。发现规则、文档与代码不一致时，不要猜测或掩盖，应先按当前事实修正文档或向用户说明。

## 项目基线

- 项目：lovestory（我们的小世界：可注册、两人配对的情侣生活记录与互动网站）
- 框架：Next.js 16 App Router、React 19、TypeScript
- 样式：Tailwind CSS
- 数据：Supabase Auth、PostgreSQL、Realtime 与 Storage
- 部署：Vercel，或 OpenNext + Cloudflare Workers
- 包管理器：npm，以 `package-lock.json` 为锁定来源

## 不可越过的边界

- 不覆盖、撤销或格式化与当前任务无关的用户改动。
- 未经用户明确要求，不执行 `git commit`、`git push`、合并、发布、线上部署或数据库 SQL。
- 不使用破坏性 Git 命令恢复工作区，不删除来源不明的文件。
- 不读取、输出或提交真实密钥、`.env.local`、用户数据或平台令牌。
- 身份只来自 Supabase Auth 会话；不要重新引入 `localStorage` 身份或写死的用户名、密码。
- 除非用户明确要求，不修改认证流程、情侣配对语义或 RLS 隔离模型。
- 不为消除报错而放宽 RLS、关闭安全检查、使用 `any`、跳过测试或吞掉错误。

## 文件放置决策

创建文件前先按下面顺序判断位置。已有文件只有在职责明确且所有引用都能同步更新时才移动。

### Next.js 路由与功能代码

| 路径 | 放置内容 |
| --- | --- |
| `app/<route>/page.tsx` | 路由入口、数据装配和页面级组合 |
| `app/<route>/components/` | 只被该功能使用的 React 组件 |
| `app/<route>/hooks/` | 只被该功能使用的 Hook |
| `app/<route>/lib/` | 该功能的纯函数、格式化、校验和数据转换 |
| `app/<route>/engine/` | 游戏规则、状态机、碰撞或算法逻辑 |
| `app/<route>/types.ts` | 多个功能内文件共用的类型 |
| `app/api/<name>/route.ts` | 服务端 HTTP 接口 |

`page.tsx` 应以页面组合为主。新增或大改后超过约 400 行时，应优先提取组件、数据、类型或纯逻辑。Canvas 游戏循环等强耦合代码可以例外，但必须保持在自己的功能目录，并在可测试的情况下把规则逻辑放入 `engine/`。

### 共享 React 代码

只有被两个或更多路由复用、或确实属于全局外壳的代码，才放入 `app/components/`：

| 路径 | 职责 |
| --- | --- |
| `app/components/ui/` | 无业务含义的按钮、标题、空状态、骨架屏、统计卡等 |
| `app/components/feedback/` | Toast、错误和全局反馈 |
| `app/components/layout/` | 导航、头像、主题面板、全局浮层和页面外壳 |
| `app/components/providers/` | Context Provider 和全局状态边界 |
| `app/components/home/` | 仅用于根首页的组合组件；这是根路由无法建立普通功能目录时的明确例外 |
| `app/components/<domain>/` | 全局壳层使用或被多个入口复用、且属于头像或 AI 聊天等明确领域的组件 |

除上表明确列出的根首页例外外，单个功能使用的组件不要提前放进共享目录。出现第二个真实消费者时，再提升为共享组件并统一 API。

### Hooks、工具与静态资源

| 路径 | 职责 |
| --- | --- |
| `hooks/` | 跨多个功能复用的 React Hooks |
| `lib/` | 不渲染 UI 的共享客户端、注册表和纯工具 |
| `public/` | 需要按 URL 原样提供的静态资源 |
| `scripts/` | 可重复运行的本地检查、维护或部署辅助脚本 |
| `patches/` | `patch-package` 管理的第三方兼容补丁 |

不要把 React 组件放进 `lib/`，不要把单页面 Hook 放进根 `hooks/`，不要把可由代码导入的源文件塞入 `public/`。

### 数据库

| 路径 | 职责 |
| --- | --- |
| `database/setup/` | 全新数据库的当前初始化入口 |
| `database/migrations/` | 当前可选择执行的增量表、字段、索引和种子变更 |
| `database/migrations/legacy/` | 被替代或字段已过时的历史迁移，不作为默认执行入口 |
| `database/fixes/` | 针对已知线上历史问题的当前修复 |
| `database/fixes/legacy/` | 已被替代的历史修复 |
| `database/diagnostics/` | 只读检查，不修改数据 |

新 SQL 文件使用小写 kebab-case。迁移应尽量幂等；合理使用 `IF EXISTS`、`IF NOT EXISTS` 和条件块。`DROP`、`TRUNCATE`、无条件 `DELETE`、覆盖种子数据、策略放宽等破坏性操作，必须在文件顶部写明影响、备份要求和恢复方式。

新建或修改 SQL 前必须：

1. 搜索 `database/` 中的同名表、字段、策略、索引和函数。
2. 核对所有 `.from('table')`、Storage 和 Realtime 使用位置。
3. 明确脚本用于新库、现有库还是历史修复。
4. 更新 `database/README.md` 的功能映射、顺序和风险。
5. 不自动连接或执行目标数据库。

### 文档

| 路径 | 职责 |
| --- | --- |
| `README.md` | 当前项目概览、最短启动方式和关键入口 |
| `AGENTS.md` | 本规则 |
| `docs/getting-started/` | 安装、Supabase、部署和环境配置 |
| `docs/guides/` | 当前功能使用与数据依赖 |
| `docs/architecture/` | 当前目录、边界和架构 |
| `docs/reports/` | 历史快照，不作为当前事实 |

根目录只保留 `README.md` 和 `AGENTS.md` 两个 Markdown 入口。移动或重命名文件后，必须同步修复 Markdown 链接、代码路径、脚本提示和 `docs/README.md` 索引。

## 导入与依赖边界

- 同一功能目录内部使用相对导入。
- 跨目录或导入共享代码时使用 `@/` 别名。
- 一个功能目录不得直接依赖另一个功能目录的内部组件；先把真正通用的部分提升到共享目录。
- 不创建只为缩短路径的多层 barrel 文件，避免隐藏客户端/服务端边界和循环依赖。
- 新增可访问页面时同步更新 `lib/features.ts`；首页和导航不得各自维护第二份功能清单。
- 客户端模块不得导入 `server-only` 代码或服务端密钥。Server Component 可以渲染 Client Component，但跨边界 Props 必须可序列化，并尽量缩小 `'use client'` 边界。

## React 与 TypeScript

- 使用函数组件、React Hooks 和严格 TypeScript。
- 只有使用状态、Effect、事件或浏览器 API 的文件才添加 `'use client'`。
- 优先复用现有 UI、Toast、加载态和认证 Hook，不复制同类实现。
- Props、数据库记录和 API 输入输出使用明确类型；不要以 `any` 绕过问题。
- Effect 必须检查依赖、清理 timer/subscription/listener，并防止卸载后更新状态。
- 异步提交要防重复点击，展示真实错误，并在乐观更新失败时恢复。
- 列表查询要选择实际需要的字段；大正文、图片数据等延迟到需要时读取。
- 图片应提供尺寸、替代文本和合理懒加载；只有首屏关键图才使用高优先级。
- 保持现有无分号风格和 Prettier 配置。

## API、Supabase 与安全

- 客户端只使用 `NEXT_PUBLIC_SUPABASE_URL` 和匿名客户端密钥。
- AI Key、管理员密钥和第三方 Secret 只在服务端或部署平台 Secret 中读取。
- API Route 必须验证类型、长度、数量和必填字段；返回面向用户的错误，不暴露内部堆栈或密钥。
- `hooks/useAuth.ts` 读取 `AuthProvider` 中的 Supabase Auth 会话、情侣 ID 和另一半资料。业务表的身份列存 Auth 用户 UUID，显示时用 `nameOf()`。
- 每张业务表都必须有 `couple_id UUID NOT NULL DEFAULT current_couple_id()`，并通过 `apply_couple_policies()` 启用情侣隔离 RLS；不得新增 `USING (true)` 之类的公开策略。
- Realtime broadcast/presence 频道名必须用 `coupleChannel()` 带上情侣 ID。
- `/api/*` 路由必须用 `lib/server-auth.ts` 的 `authenticatedUser()` 校验登录，客户端用 `lib/auth-fetch.ts` 调用。
- 时光胶囊收件人、开启时间、游戏胜负和余额等客户端检查，只在情侣内部生效，不得描述为可信授权。

新增环境变量时：

1. 在 `.env.local.example` 添加无敏感值占位符。
2. 说明它是构建时、客户端还是服务端运行时变量。
3. 更新 `README.md` 或 `docs/getting-started/DEPLOYMENT.md`。
4. 不把真实值写入 `wrangler.toml`、代码、日志或文档。

## 生成物与本机文件

以下内容不得提交：

- `.env*`（仅保留 `.env.local.example`）
- `.dev.vars*`
- `.next/`
- `.open-next/`
- `.wrangler/`
- `node_modules/`
- `*.tsbuildinfo`
- 本机专用 `.claude/settings.local.json`

`next-env.d.ts` 和构建产物由工具生成，不手工修改。`cloudflare-env.d.ts` 应通过 `npm run cf-typegen` 生成；使用 Cloudflare bindings 时应提交该类型文件，并在 binding、compatibility date 或 flags 变化后重新生成。共享编辑器或 AI 工具配置必须脱敏，不能包含个人路径、账号、令牌或过宽命令权限。

## 依赖与平台配置

- 使用 npm，不混入 yarn、pnpm 或其他锁文件。
- 安装锁定依赖使用 `npm ci`；明确升级依赖时才使用 `npm install` 并提交 lockfile 变化。
- 不删除 `package.json` 的安全 overrides 或 `patches/` 补丁，除非完成替代验证。
- 修改 Next.js、TypeScript、ESLint、PostCSS、Tailwind、OpenNext、Wrangler 或关键依赖后，运行完整检查。
- Cloudflare Workers Builds 的命令维护在 `docs/getting-started/DEPLOYMENT.md`。不要同时配置会造成重复执行的 Dashboard Build 和 Wrangler Custom Build。
- 未经用户明确要求，不运行真正的 `npm run deploy`、`npm run upload` 或平台发布命令。

## 标准工作流

1. 读取本规则、README 和相关专题文档。
2. 运行 `git status --short`，识别并保护现有改动。
3. 使用 `rg` 定位定义、消费者、数据库字段和文档引用。
4. 选择正确目录；先移动再统一修正所有 import 和链接。
5. 以最小、聚焦的差异实现需求，不顺手重构无关功能。
6. 运行与风险匹配的检查。
7. 用 `git diff --check`、`git diff --stat` 和定向搜索复核。
8. 交付时说明改动、SQL、检查结果、风险和手动步骤。

## 检查矩阵

| 变更 | 最低检查 |
| --- | --- |
| 纯文档 | 本地 Markdown 链接、文档路径、`git diff --check` |
| 文件移动/导入调整 | `npm run lint`、`npm run typecheck` |
| 页面、组件、Hook、工具 | `npm run lint`、`npm run typecheck` |
| 路由、类型、配置、依赖、生产行为 | `npm run check` |
| Cloudflare/OpenNext | `npm run lint`、`npm run typecheck`、`npm run cf:build` |
| 依赖升级 | 上述检查加 `npm audit`，并确认 `postinstall` 补丁成功 |
| SQL | 静态审查、消费者字段核对、更新 `database/README.md`；除非授权，不执行 |

若检查脚本本身失效，必须说明它是既有问题还是本次变更导致，不能隐瞒、绕过或声称通过。

## 交付清单

最终说明必须包含：

- 修改了什么，主要文件在哪里
- 移动、删除或归档了哪些文件
- 是否新增 SQL，以及是否需要人工执行
- 实际运行了哪些检查及结果
- 仍存在的认证、RLS、Storage、平台或历史兼容风险
- 需要用户在 Supabase、Vercel、Cloudflare 或 GitHub 手动完成的步骤

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
