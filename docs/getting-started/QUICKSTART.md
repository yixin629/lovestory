# 快速启动指南

本指南用于在本地运行当前项目。完整项目说明见根目录 [README.md](../../README.md)。

## 1. 准备环境

- Node.js 20.9 或更高版本
- npm
- 一个 Supabase 项目

在仓库根目录安装锁定版本的依赖：

```bash
npm ci
```

`postinstall` 会自动应用 `patches/` 中的兼容补丁。如果安装阶段提示补丁失败，不要忽略，应先确认依赖版本和补丁是否仍匹配。

## 2. 创建本地环境文件

Windows PowerShell：

```powershell
Copy-Item .env.local.example .env.local
```

macOS 或 Linux：

```bash
cp .env.local.example .env.local
```

至少填写：

```env
NEXT_PUBLIC_SUPABASE_URL=你的项目地址
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的匿名客户端密钥
```

AI 助手和 YouTube 搜索都是可选的服务端变量，按 `.env.local.example` 中的说明填写，详见 [部署与持续集成](./DEPLOYMENT.md#环境变量)。不要提交 `.env.local`。

## 3. 初始化 Supabase

在新建的 Supabase 项目的 SQL Editor 中，按编号顺序执行 `database/setup/` 下的全部脚本（`01-core-auth.sql` 必须最先执行）。脚本会建好所有表、RLS 策略、Realtime 和 `photos` / `avatars` 两个 Storage bucket。

然后在 Authentication > URL Configuration 中把 `http://localhost:3000/**` 加入 Redirect URLs，否则注册验证邮件和找回密码邮件无法跳回本地。

详细说明见 [Supabase 配置指南](./SUPABASE_SETUP.md) 和 [数据库脚本说明](../../database/README.md)。

## 4. 注册并配对

启动后打开登录页注册账号。默认需要先点击验证邮件里的链接才能登录。登录后创建情侣空间，把 8 位邀请码发给另一半；对方注册登录后在配对页输入邀请码。

## 5. 启动

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

同一局域网内需要从手机访问时：

```bash
npm run dev -- --hostname 0.0.0.0
```

再通过 `http://电脑局域网IP:3000` 打开。只在可信网络中使用这种方式。

## 6. 提交前检查

```bash
npm run check
```

该命令会依次运行 lint、类型检查和标准生产构建。

如果目标是 Cloudflare Workers，再运行：

```bash
npm run cf:build
```

## 常见问题

### 缺少表或字段

如果浏览器控制台出现 `relation does not exist` 或 `column does not exist`，说明 `database/setup/` 中有脚本没执行或执行失败。脚本都是幂等的，可以按顺序重新执行。

### RLS 或 Storage 拒绝访问

确认 `database/setup/` 的脚本都已按顺序执行，并且当前账号已完成配对。所有业务表只允许本情侣成员读写；未配对账号写入会被 RLS 拒绝。上传照片的路径必须以 `<couple_id>/` 开头，头像以 `<user_id>/` 开头。

### 端口被占用

```bash
npm run dev -- -p 3001
```

### TypeScript 或生产构建失败

先分别运行：

```bash
npm run typecheck
npm run build
```

修复输出中的第一条实际错误。`npm run build` 不是“重新生成类型”的替代命令。

## 部署

Vercel 和 Cloudflare Workers 的准确配置见 [部署与持续集成](./DEPLOYMENT.md)。不要使用旧的一键部署链接或示例仓库地址。
