# 日迹 · 工作复盘与周期总结

> 当前版本：**Alpha 0.0.4**

日迹是一个面向中文用户的个人工作复盘工具。它把“复盘昨天、总结今天、预设明天”放在同一个工作台中，并根据每日记录自动汇总周、月、季度和年度总结。

- 正式地址：[https://www.daily-work-review.com/](https://www.daily-work-review.com/)
- 留言反馈：[https://www.daily-work-review.com/feedback/](https://www.daily-work-review.com/feedback/)
- 更新记录：[CHANGELOG.md](./CHANGELOG.md)

## 主要功能

### 每日工作台

- 按日期记录工作内容、推进状态、工作进展、问题阻碍、经验收获、心情和专注度。
- 今日工作支持“待开始、进行中、已完成、延期”四种状态，多行内容会随输入自动扩展。
- 昨日复盘可以直接调整工作状态、返回编辑昨天，或把未完成工作加入今天。
- 明日计划支持“待开始、进行中、已完成、延期”四种状态。
- 未完成的任务会自动顺延到下一天，并避免重复带入。
- 用户可以自行开启邮件提醒，并设置每天 1—3 次提醒及具体时间。
- 日报内容可以一键复制，便于发送日报或保存到其他工具。

### 周期总结

- 支持周、月、季度和年度四种总结视图。
- 可以切换上一周期、下一周期，并快速返回当前周期。
- 自动统计有记录的工作天数、完成事项、平均专注度和计划数量。
- 自动整理周期内的完成事项与每日进展。
- 每个周期可分别填写关键成果、经验与成长、问题与改进、下一阶段重点；填写区可以展开或收起。
- 周期总结可一键复制，不同周期的人工复盘互不覆盖。

### 账号与数据同步

- 使用 Supabase Auth 提供邮箱注册、邮箱验证、登录和退出。
- 注册界面包含确认密码、密码强度提示和明确的成功或错误反馈。
- 数据先保存到当前用户的浏览器缓存，再自动同步到 Supabase。
- 页面会显示“正在同步云端、云端已同步、云端同步失败”等状态。
- 首次登录时可将早期未绑定账号的本地数据迁移到当前账号。

### 个性化与反馈

- “今日一句”会随机展示内置语录，并支持手动换一句。
- 用户可以添加自己的语录，自定义内容会随账号数据同步。
- 网页内置版本号和更新日志入口。
- 独立留言页面支持功能建议、问题反馈、体验优化和其他留言。
- 留言通过 FormSubmit 转发到开发者邮箱，不会在网站公开展示。

## 数据与隐私

日迹采用“本地缓存 + Supabase 云端同步”的保存方式：

- `daymark-entries:<user-id>`：每日工作记录与任务状态。
- `daymark-period-summaries:<user-id>`：周期复盘内容。
- `daymark-custom-quotes:<user-id>`：自定义语录。
- Supabase 表 `daymark_state`：按 `user_id` 保存以上三类云端数据。
- Supabase 表 `reminder_preferences`：按用户保存邮件提醒开关、邮箱、次数和时间。
- Supabase 表 `reminder_delivery_log`：仅供服务端去重和记录邮件投递结果。

旧版未绑定账号的数据键仍会被识别，并在首次登录时迁移：

- `daymark-entries`
- `daymark-period-summaries`
- `daymark-custom-quotes`

浏览器缓存用于提升可用性并在云端暂时不可用时保留当前内容；登录后以账号对应的云端数据为准。留言内容由 FormSubmit 邮件转发服务处理，不写入 Supabase。

## 技术栈

- [Next.js 16](https://nextjs.org/) App Router
- React 19 + TypeScript
- Supabase Auth 与 Postgres 数据存储
- Supabase Cron + Edge Functions 定时触发提醒
- Resend 发送提醒邮件
- 原生 CSS 响应式界面
- Node.js Test Runner
- Vercel 自动构建与部署

项目使用 Next.js 静态导出，生产构建结果生成在 `out` 目录。

## 本地开发

### 环境要求

- Node.js `>=22.13.0`
- npm
- 已配置 `daymark_state` 数据表和访问策略的 Supabase 项目

### 安装与启动

```bash
npm install
```

在项目根目录创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_项目地址
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的_Supabase_Publishable_Key
```

启动本地开发服务器：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 邮件提醒后端

邮件提醒依赖 `supabase/` 中的迁移和 Edge Function。首次配置时：

```bash
npx supabase link --project-ref 你的项目标识
npx supabase db push
npx supabase secrets set RESEND_API_KEY=你的_Resend_API_Key
npx supabase secrets set "REMINDER_FROM=日迹 <reminder@daily-work-review.com>"
npx supabase functions deploy send-work-reminders --use-api
```

还需要在 Resend 验证 `daily-work-review.com` 发信域名，并在 Supabase Cron 中创建一个每 5 分钟执行的 Edge Function 任务：

```cron
*/5 * * * *
```

Cron 调用 `send-work-reminders` 时把 Supabase secret key 放在 `apikey` 请求头中进行服务端鉴权。secret key 应存入 Supabase Vault 并在调用时读取，不要明文写入 SQL；也不要把 secret key 或 `RESEND_API_KEY` 放入 `NEXT_PUBLIC_` 环境变量或提交到仓库。

### 检查与构建

```bash
# ESLint
npm run lint

# 生成静态站点到 out
npm run build

# 重新构建并运行自动化测试
npm test

# 本地预览 out
npm run preview
```

## 项目结构

```text
app/
├─ page.tsx                 # 每日工作台、周期总结与云端同步
├─ feedback/page.tsx        # 独立留言反馈页
└─ globals.css              # 全站样式与响应式布局
components/
├─ AuthPanel.tsx            # 登录与注册
├─ ChangelogDialog.tsx      # 网页内更新日志
└─ FeedbackPanel.tsx        # 留言表单
lib/
├─ changelog.ts             # 当前版本与更新内容
├─ supabase.ts              # Supabase 客户端
└─ task-plans.ts            # 任务状态与自动顺延逻辑
supabase/
├─ migrations/              # 邮件提醒表、RLS 与投递日志
└─ functions/               # 定时扫描并发送提醒邮件
tests/
└─ rendered-html.test.mjs   # 静态输出与核心功能测试
```

## 发布流程

生产站点已经从 Netlify 迁移到 Vercel，当前唯一正式地址为：

[https://www.daily-work-review.com/](https://www.daily-work-review.com/)

Vercel 默认域名 `https://daily-work-review.vercel.app/` 仅作为部署域名保留。

项目连接 GitHub，经过审核的代码推送到 `main` 后由 Vercel 自动构建和发布。日常修改遵循 [AGENTS.md](./AGENTS.md) 中的流程：

1. 只在本地项目中修改源码。
2. 完成本地检查和构建。
3. 保持改动未提交，先交由项目所有者审查。
4. 获得明确发布许可后，再提交 GitHub 并检查 Vercel 部署。

`netlify.toml` 仅作为历史配置保留，Netlify 已不再是当前发布目标。

## 版本管理

项目处于 Alpha 阶段，版本号由以下文件共同维护：

- `package.json`
- `package-lock.json`
- `lib/changelog.ts`
- `CHANGELOG.md`

每次对外发布时，需要同步更新版本号和网页内更新日志。详细约定见 [CHANGELOG.md](./CHANGELOG.md)。
